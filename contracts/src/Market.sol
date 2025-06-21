pragma solidity ^0.5.0;

import "./ETK_ERC20.sol";
import "./IDRS_ERC20.sol";

contract Market {
    ETK public etk_token;
    IDRS public idrs_coin;

    struct Order {
        uint256 id; // Unique ID for the order
        address user;
        uint256 amount;
        uint256 price;
        uint256 timestamp; // Add timestamp for order priority
    }

    mapping(uint256 => Order) public buyOrders;
    mapping(uint256 => Order) public sellOrders;
    uint256[] public buyOrderIds;
    uint256[] public sellOrderIds;

    event TransactionCompleted(
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 price,
        uint256 timestamp
    );

    event OrderCancelled(
        address indexed user,
        uint256 amount,
        uint256 price,
        bool isBuy,
        uint256 timestamp
    );

    event OrderPlaced(
        uint256 indexed id,
        address indexed user,
        uint256 amount,
        uint256 price,
        bool isBuy,
        uint256 timestamp
    );

    constructor(address _etk_tokenAddress, address _idrs_coinAddress) public {
        etk_token = ETK(_etk_tokenAddress);
        idrs_coin = IDRS(_idrs_coinAddress);
    }

    function placeOrder(
        uint256 _uuid,
        uint256 _amount,
        uint256 _price,
        bool _isBuy
    ) public {
        require(
            buyOrders[_uuid].id == 0 && sellOrders[_uuid].id == 0,
            "UUID already exists"
        );

        if (_isBuy) {
            require(
                idrs_coin.transferFrom(
                    msg.sender,
                    address(this),
                    _amount * _price
                ),
                "Payment failed"
            );
            buyOrders[_uuid] = Order(
                _uuid,
                msg.sender,
                _amount,
                _price,
                block.timestamp
            );
            buyOrderIds.push(_uuid);

            // Emit event for the new buy order
            emit OrderPlaced(
                _uuid,
                msg.sender,
                _amount,
                _price,
                true,
                block.timestamp
            );
        } else {
            require(
                etk_token.transferFrom(msg.sender, address(this), _amount),
                "Token transfer failed"
            );
            sellOrders[_uuid] = Order(
                _uuid,
                msg.sender,
                _amount,
                _price,
                block.timestamp
            );
            sellOrderIds.push(_uuid);

            // Emit event for the new sell order
            emit OrderPlaced(
                _uuid,
                msg.sender,
                _amount,
                _price,
                false,
                block.timestamp
            );
        }

        // Call matchOrders to attempt matching
        matchOrders();
    }

    // Modify matchOrders to prioritize by timestamp for same price
    function matchOrders() internal {
        uint i = 0;
        while (i < buyOrderIds.length) {
            uint j = 0;
            while (j < sellOrderIds.length) {
                Order storage buyOrder = buyOrders[buyOrderIds[i]];
                Order storage sellOrder = sellOrders[sellOrderIds[j]];

                // Check if buy order price is greater than or equal to sell order price
                if (buyOrder.price >= sellOrder.price) {
                    uint256 matchedAmount = buyOrder.amount < sellOrder.amount
                        ? buyOrder.amount
                        : sellOrder.amount;

                    // Transfer tokens from seller to buyer
                    require(
                        etk_token.transfer(buyOrder.user, matchedAmount),
                        "Token transfer to buyer failed"
                    );

                    // Transfer payment from contract to seller
                    require(
                        idrs_coin.transfer(
                            sellOrder.user,
                            matchedAmount * buyOrder.price
                        ),
                        "Payment transfer to seller failed"
                    );

                    // Emit event for transaction
                    emit TransactionCompleted(
                        buyOrder.user,
                        sellOrder.user,
                        matchedAmount,
                        buyOrder.price,
                        block.timestamp
                    );

                    // Adjust order amounts
                    buyOrder.amount -= matchedAmount;
                    sellOrder.amount -= matchedAmount;

                    // Remove fully matched sell order
                    if (sellOrder.amount == 0) {
                        delete sellOrders[sellOrderIds[j]];
                        sellOrderIds[j] = sellOrderIds[sellOrderIds.length - 1];
                        sellOrderIds.pop();
                    } else {
                        j++;
                    }

                    // Remove fully matched buy order
                    if (buyOrder.amount == 0) {
                        delete buyOrders[buyOrderIds[i]];
                        buyOrderIds[i] = buyOrderIds[buyOrderIds.length - 1];
                        buyOrderIds.pop();
                        break;
                    }
                } else {
                    // If no match, move to the next sell order
                    j++;
                }
            }
            i++;
        }
    }

    function cancelOrder(uint256 id, bool isBuy) public {
        if (isBuy) {
            Order storage order = buyOrders[id];
            require(order.user == msg.sender, "Not your order");

            // Refund IDRS to the user
            require(
                idrs_coin.transfer(msg.sender, order.amount * order.price),
                "Refund failed"
            );

            // Emit event for cancellation
            emit OrderCancelled(
                order.user,
                order.amount,
                order.price,
                true,
                block.timestamp
            );

            // Remove the order
            delete buyOrders[id];
            for (uint i = 0; i < buyOrderIds.length; i++) {
                if (buyOrderIds[i] == id) {
                    buyOrderIds[i] = buyOrderIds[buyOrderIds.length - 1];
                    buyOrderIds.pop();
                    return; // Exit the function after successfully canceling the order
                }
            }
        } else {
            Order storage order = sellOrders[id];
            require(order.user == msg.sender, "Not your order");

            // Refund tokens to the user
            require(
                etk_token.transfer(msg.sender, order.amount),
                "Refund failed"
            );

            // Emit event for cancellation
            emit OrderCancelled(
                order.user,
                order.amount,
                order.price,
                false,
                block.timestamp
            );

            // Remove the order
            delete sellOrders[id];
            for (uint i = 0; i < sellOrderIds.length; i++) {
                if (sellOrderIds[i] == id) {
                    sellOrderIds[i] = sellOrderIds[sellOrderIds.length - 1];
                    sellOrderIds.pop();
                    return; // Exit the function after successfully canceling the order
                }
            }
        }

        // If the function reaches this point, the order was not found
        revert("Order not found");
    }

    function getBuyOrders()
        public
        view
        returns (address[] memory, uint256[] memory, uint256[] memory)
    {
        address[] memory users = new address[](buyOrderIds.length);
        uint256[] memory amounts = new uint256[](buyOrderIds.length);
        uint256[] memory prices = new uint256[](buyOrderIds.length);

        for (uint i = 0; i < buyOrderIds.length; i++) {
            Order storage order = buyOrders[buyOrderIds[i]];
            users[i] = order.user;
            amounts[i] = order.amount;
            prices[i] = order.price;
        }

        return (users, amounts, prices);
    }

    function getSellOrders()
        public
        view
        returns (address[] memory, uint256[] memory, uint256[] memory)
    {
        address[] memory users = new address[](sellOrderIds.length);
        uint256[] memory amounts = new uint256[](sellOrderIds.length);
        uint256[] memory prices = new uint256[](sellOrderIds.length);

        for (uint i = 0; i < sellOrderIds.length; i++) {
            Order storage order = sellOrders[sellOrderIds[i]];
            users[i] = order.user;
            amounts[i] = order.amount;
            prices[i] = order.price;
        }

        return (users, amounts, prices);
    }

    function getMarketPrice() public view returns (uint256) {
        uint256 totalAmount = 0;
        uint256 totalValue = 0;

        for (uint i = 0; i < buyOrderIds.length; i++) {
            Order storage order = buyOrders[buyOrderIds[i]];
            totalAmount += order.amount;
            totalValue += order.amount * order.price;
        }

        for (uint i = 0; i < sellOrderIds.length; i++) {
            Order storage order = sellOrders[sellOrderIds[i]];
            totalAmount += order.amount;
            totalValue += order.amount * order.price;
        }

        if (totalAmount == 0) {
            return 0; // No orders, market price is undefined
        }

        return totalValue / totalAmount; // Weighted average price
    }
}

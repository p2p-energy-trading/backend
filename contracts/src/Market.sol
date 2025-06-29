pragma solidity ^0.5.0;

import './ETK_ERC20.sol';
import './IDRS_ERC20.sol';

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
        uint256 timestamp,
        uint256 buyOrderId,
        uint256 sellOrderId
    );

    event OrderCancelled(
        address indexed user,
        uint256 amount,
        uint256 price,
        bool isBuy,
        uint256 timestamp,
        uint256 orderId
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
            'UUID already exists'
        );

        uint256 etkDecimals = etk_token.decimals();

        if (_isBuy) {
            uint256 totalIDRS = (_amount * _price) /
                (10 ** uint256(etkDecimals)); // Calculate total IDRS for the buy order
            require(
                idrs_coin.transferFrom(msg.sender, address(this), totalIDRS),
                'Payment failed'
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
                'Token transfer failed'
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
        uint256 etkDecimals = etk_token.decimals();
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
                        'Token transfer to buyer failed'
                    );

                    // uint256 totalIDRS = (order.amount * order.price) / (10 ** uint256(etkDecimals)); // Calculate total IDRS for the buy order
                    uint256 totalIDRS = (matchedAmount * buyOrder.price) /
                        (10 ** uint256(etkDecimals)); // Calculate total IDRS for the buy order
                    // Transfer payment from contract to seller
                    require(
                        idrs_coin.transfer(sellOrder.user, totalIDRS),
                        'Payment transfer to seller failed'
                    );

                    // Emit event for transaction
                    emit TransactionCompleted(
                        buyOrder.user,
                        sellOrder.user,
                        matchedAmount,
                        buyOrder.price,
                        block.timestamp,
                        buyOrder.id,
                        sellOrder.id
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
        uint256 etkDecimals = etk_token.decimals();
        if (isBuy) {
            Order storage order = buyOrders[id];
            require(order.user == msg.sender, 'Not your order');

            uint256 totalIDRS = (order.amount * order.price) /
                (10 ** uint256(etkDecimals)); // Calculate total IDRS for the buy order
            // Refund IDRS to the user
            require(idrs_coin.transfer(msg.sender, totalIDRS), 'Refund failed');

            // Emit event for cancellation
            emit OrderCancelled(
                order.user,
                order.amount,
                order.price,
                true,
                block.timestamp,
                id
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
            require(order.user == msg.sender, 'Not your order');

            // Refund tokens to the user
            require(
                etk_token.transfer(msg.sender, order.amount),
                'Refund failed'
            );

            // Emit event for cancellation
            emit OrderCancelled(
                order.user,
                order.amount,
                order.price,
                false,
                block.timestamp,
                id
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
        revert('Order not found');
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
        if (sellOrderIds.length == 0) {
            // No sell orders, try to get highest bid from buy orders
            if (buyOrderIds.length == 0) {
                return 0; // No buy orders either
            }
            uint256 highestBid = buyOrders[buyOrderIds[0]].price;
            for (uint i = 1; i < buyOrderIds.length; i++) {
                uint256 price = buyOrders[buyOrderIds[i]].price;
                if (price > highestBid) {
                    highestBid = price;
                }
            }
            return highestBid;
        }
        uint256 lowestPrice = sellOrders[sellOrderIds[0]].price;
        for (uint i = 1; i < sellOrderIds.length; i++) {
            uint256 price = sellOrders[sellOrderIds[i]].price;
            if (price < lowestPrice) {
                lowestPrice = price;
            }
        }
        return lowestPrice;
    }

    // Get total ETK supply held by the market contract
    function getTotalETKSupplyInMarket() public view returns (uint256) {
        return etk_token.balanceOf(address(this));
    }

    // Get total IDRS supply held by the market contract
    function getTotalIDRSSupplyInMarket() public view returns (uint256) {
        return idrs_coin.balanceOf(address(this));
    }

    // Get market liquidity information including token supplies and order counts
    function getMarketLiquidity()
        public
        view
        returns (
            uint256 etkSupply,
            uint256 idrsSupply,
            uint256 buyOrderCount,
            uint256 sellOrderCount
        )
    {
        return (
            etk_token.balanceOf(address(this)),
            idrs_coin.balanceOf(address(this)),
            buyOrderIds.length,
            sellOrderIds.length
        );
    }
}

pragma solidity ^0.5.0;

contract ETK {
    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;
    uint256 public _totalSupply;
    string public name = 'Energy Token';
    string public symbol = 'ETK';
    uint8 public decimals = 2; // 0.01 kWH
    uint256 initial_supply = 0 * 10 ** uint256(decimals);
    address marketAddress;
    address energyConverterAddress;
    address owner;

    constructor() public {
        balances[msg.sender] = initial_supply;
        _totalSupply = initial_supply;
        owner = msg.sender;
    }

    function transfer(address _to, uint256 _amount) external returns (bool) {
        require(balances[msg.sender] >= _amount, 'Not enough balance');
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
        return true;
    }

    function whiteListMarket(address _marketAddress) external {
        require(msg.sender == owner, 'Not authorized');
        marketAddress = _marketAddress;
    }

    function whiteListEnergyConverter(
        address _energyConverterAddress
    ) external {
        require(msg.sender == owner, 'Not authorized');
        energyConverterAddress = _energyConverterAddress;
    }

    function approve(
        address _spender,
        uint256 _amount
    ) external returns (bool) {
        allowances[msg.sender][_spender] = _amount;
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool) {
        require(balances[_from] >= _amount, 'Not enough balance');
        if (
            msg.sender == marketAddress || msg.sender == energyConverterAddress
        ) {
            // If the sender is the marketAddress or energyConverterAddress, skip allowance check
            balances[_from] -= _amount;
            balances[_to] += _amount;
        } else {
            require(
                allowances[_from][msg.sender] >= _amount,
                'Not enough allowance'
            );
            balances[_from] -= _amount;
            balances[_to] += _amount;
            allowances[_from][msg.sender] -= _amount;
        }
        return true;
    }

    function allowance(
        address _owner,
        address _spender
    ) external view returns (uint256) {
        return allowances[_owner][_spender];
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return balances[_owner];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function mint(uint256 _amount) external {
        _totalSupply += _amount;
        balances[msg.sender] += _amount;
    }

    function burn(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, 'Not enough balance');
        _totalSupply -= _amount;
        balances[msg.sender] -= _amount;
    }
}

const { getWeth, AMOUNT } = require("./getWeth")
const { getNamedAccounts, ethers } = require("hardhat")
async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    //0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address is : ${lendingPool.address}`)
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveerc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log(`Depositing...`)
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log(`DEPOSTED!`)
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)
    const DaiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / DaiPrice.toNumber())
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    const daitokenaddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daitokenaddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)
    await repay(amountDaiToBorrowWei, daitokenaddress, lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveerc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You have borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616e4d11a78f511299002da57a0a94577f1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`Dai ETH price is ${price.toString()}`)
    return price
}
async function approveerc20(wethTokenAddress, spendAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", wethTokenAddress, account)
    const tx = await erc20Token.approve(spendAddress, amountToSpend)
    await tx.wait(1)
    console.log(`approved ${amountToSpend} WETH`)
}

async function getLendingPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

// Borrow
async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} total Debt of ETH`)
    console.log(`You can borrow ${availableBorrowsETH} ETH`)
    return { availableBorrowsETH, totalDebtETH }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

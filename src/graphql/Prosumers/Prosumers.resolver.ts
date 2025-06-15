import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { ProsumersService } from './Prosumers.service';
import { Prosumers } from './dto/Prosumers.output';
import { CreateProsumersInput } from './dto/Prosumers.input';
import { ProsumersArgs } from './dto/Prosumers.args';
import { BlockchainApprovals } from '../BlockchainApprovals/dto/BlockchainApprovals.output';
import { DeviceCommands } from '../DeviceCommands/dto/DeviceCommands.output';
import { IdrsConversions } from '../IdrsConversions/dto/IdrsConversions.output';
import { MarketTrades } from '../MarketTrades/dto/MarketTrades.output';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';
import { TradeOrdersCache } from '../TradeOrdersCache/dto/TradeOrdersCache.output';
import { TransactionLogs } from '../TransactionLogs/dto/TransactionLogs.output';
import { Wallets } from '../Wallets/dto/Wallets.output';

@Resolver(() => Prosumers)
export class ProsumersResolver {
  constructor(private readonly ProsumersService: ProsumersService) {}

  @Query(() => [Prosumers], { name: 'ProsumersAll' })
  findAll(@Args() args: ProsumersArgs) {
    return this.ProsumersService.findAll(args);
  }

  @Query(() => Prosumers, { name: 'Prosumers' })
  findOne(@Args('prosumerId', { type: () => String }) prosumerId: string) {
    return this.ProsumersService.findOne(prosumerId);
  }

  @Mutation(() => Prosumers)
  createProsumers(@Args('input') input: CreateProsumersInput) {
    return this.ProsumersService.create(input);
  }

  @Mutation(() => Prosumers)
  updateProsumers(
    @Args('prosumerId', { type: () => String }) prosumerId: string,
    @Args('input') input: CreateProsumersInput,
  ) {
    return this.ProsumersService.update(prosumerId, input);
  }

  @Mutation(() => Boolean)
  removeProsumers(
    @Args('prosumerId', { type: () => String }) prosumerId: string,
  ) {
    return this.ProsumersService.remove(prosumerId);
  }

  @ResolveField(() => [BlockchainApprovals])
  async blockchainapprovalsList(
    @Parent() Prosumers: Prosumers,
  ): Promise<any[]> {
    return this.ProsumersService.findBlockchainapprovalsList(
      Prosumers.prosumerId,
    );
  }

  @ResolveField(() => [DeviceCommands])
  async devicecommandsList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findDevicecommandsList(Prosumers.prosumerId);
  }

  @ResolveField(() => [IdrsConversions])
  async idrsconversionsList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findIdrsconversionsList(Prosumers.prosumerId);
  }

  @ResolveField(() => [MarketTrades])
  async markettradesList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findMarkettradesList(Prosumers.prosumerId);
  }

  @ResolveField(() => [MarketTrades])
  async markettradesList2(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findMarkettradesList2(Prosumers.prosumerId);
  }

  @ResolveField(() => [SmartMeters])
  async smartmetersList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findSmartmetersList(Prosumers.prosumerId);
  }

  @ResolveField(() => [TradeOrdersCache])
  async tradeorderscacheList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findTradeorderscacheList(Prosumers.prosumerId);
  }

  @ResolveField(() => [TransactionLogs])
  async transactionlogsList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findTransactionlogsList(Prosumers.prosumerId);
  }

  @ResolveField(() => [Wallets])
  async walletsList(@Parent() Prosumers: Prosumers): Promise<any[]> {
    return this.ProsumersService.findWalletsList(Prosumers.prosumerId);
  }
}

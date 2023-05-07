import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/solid'
import { ConstantProductPool, Pair, StablePool } from '@sushiswap/amm'
import { ChainId } from '@sushiswap/chain'
import { defaultQuoteCurrency, Native, tryParseAmount, Type } from '@sushiswap/currency'
import { BreadcrumbLink, Dots, Loader } from '@sushiswap/ui'
import {
  Address,
  ConstantProductPoolState,
  getSushiSwapRouterContractConfig,
  getTridentRouterContractConfig,
  PairState,
  PoolFinder,
  PoolFinderType,
  StablePoolState,
} from '@sushiswap/wagmi'
import {
  AddSectionReviewModalLegacy,
  AddSectionReviewModalTrident,
  FEE_MAP,
  Layout,
  SelectFeeWidget,
  SelectNetworkWidget,
  SelectPoolTypeWidget,
  SelectTokensWidget,
} from '../../../../components'
import React, { Dispatch, FC, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react'
import { SWRConfig } from 'swr'
import { isUniswapV2Router02ChainId } from '@sushiswap/sushiswap'

import { CreateSectionReviewModalTrident } from '../../../../components/CreateSection'
import { SUPPORTED_CHAIN_IDS, TRIDENT_ENABLED_NETWORKS } from '../../../../config'
import { isConstantProductPool, isLegacyPool, isStablePool } from '../../../../lib/functions'
import { bentoBoxV1Address, isBentoBoxV1ChainId } from '@sushiswap/bentobox'
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import { useRouter } from 'next/router'
import { isConstantProductPoolFactoryChainId, isStablePoolFactoryChainId } from '@sushiswap/trident'
import { ContentBlock } from '../../../../components/AddPage/ContentBlock'
import { Web3Input } from '@sushiswap/wagmi/future/components/Web3Input'
import Link from 'next/link'
import { IconButton } from '@sushiswap/ui/future/components/IconButton'
import { Checker } from '@sushiswap/wagmi/future/systems'
import { Button } from '@sushiswap/ui/future/components/button'
import { Signature } from '@ethersproject/bytes'

const LINKS: BreadcrumbLink[] = [
  {
    href: `/add`,
    label: `Add`,
  },
]

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const chainId = params?.chainId ? (parseInt(params.chainId as string) as ChainId) : ChainId.ETHEREUM
  return {
    props: {
      chainId,
    },
  }
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// the path has not been generated.
export const getStaticPaths: GetStaticPaths = async () => {
  // Get the paths we want to pre-render based on supported chain ids
  const paths = SUPPORTED_CHAIN_IDS.map((chainId) => ({
    params: {
      chainId: chainId.toString(),
    },
  }))

  // We'll pre-render only these paths at build time.
  // { fallback: 'blocking' } will server-render pages
  // on-demand if the path doesn't exist.
  return { paths, fallback: false }
}

export function Add(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter()
  const [chainId, setChainId] = useState(props.chainId)
  const [fee, setFee] = useState(2)
  const [poolType, setPoolType] = useState(PoolFinderType.Classic)

  const [token0, setToken0] = useState<Type | undefined>(Native.onChain(chainId))
  const [token1, setToken1] = useState<Type | undefined>(
    defaultQuoteCurrency[chainId as keyof typeof defaultQuoteCurrency]
  )

  useEffect(() => {
    setToken0(Native.onChain(chainId))
    setToken1(defaultQuoteCurrency[chainId as keyof typeof defaultQuoteCurrency])
  }, [chainId])

  // Reset default fee if switching networks and not on a trident enabled network
  useEffect(() => {
    if (!TRIDENT_ENABLED_NETWORKS.includes(chainId)) {
      setFee(2)
      setPoolType(PoolFinderType.Classic)
    }
  }, [chainId])

  const tridentPoolIfCreate = TRIDENT_ENABLED_NETWORKS.includes(chainId)

  return (
    <SWRConfig>
      <Layout>
        <div className="flex flex-col gap-2">
          <Link className="flex items-center gap-4 mb-2 group" href="/" shallow={true}>
            <IconButton
              icon={ArrowLeftIcon}
              iconProps={{
                width: 24,
                height: 24,
                transparent: true,
              }}
            />
            <span className="group-hover:opacity-[1] transition-all opacity-0 text-sm font-medium">
              Go back to pools list
            </span>
          </Link>
          <h1 className="mt-2 text-3xl font-medium">Add Liquidity</h1>
          <h1 className="text-lg text-gray-600 dark:dark:text-slate-400 text-slate-600">
            Create a new pool or create a liquidity position on an existing pool.
          </h1>
        </div>
        <div className="grid grid-cols-1 sm:w-[340px] md:w-[572px] gap-10">
          <div className="hidden md:block" />
          <PoolFinder
            components={
              <PoolFinder.Components>
                <PoolFinder.LegacyPool
                  chainId={chainId}
                  token0={token0}
                  token1={token1}
                  enabled={isUniswapV2Router02ChainId(chainId)}
                />
                <PoolFinder.ConstantProductPool
                  chainId={chainId}
                  token0={token0}
                  token1={token1}
                  enabled={
                    isConstantProductPoolFactoryChainId(chainId) &&
                    poolType === PoolFinderType.Classic &&
                    TRIDENT_ENABLED_NETWORKS.includes(chainId)
                  }
                  fee={fee}
                  twap={false}
                />
                <PoolFinder.StablePool
                  chainId={chainId}
                  token0={token0}
                  token1={token1}
                  enabled={
                    isStablePoolFactoryChainId(chainId) &&
                    poolType === PoolFinderType.Stable &&
                    TRIDENT_ENABLED_NETWORKS.includes(chainId)
                  }
                  fee={fee}
                  twap={false}
                />
              </PoolFinder.Components>
            }
          >
            {({ pool: [poolState, pool] }) => {
              const title =
                !token0 || !token1 ? (
                  'Select Tokens'
                ) : [PairState.LOADING, ConstantProductPoolState.LOADING, StablePoolState.LOADING].includes(
                    poolState
                  ) ? (
                  <div className="h-[20px] flex items-center justify-center">
                    <Loader width={14} />
                  </div>
                ) : [PairState.EXISTS, ConstantProductPoolState.EXISTS, StablePoolState.EXISTS].includes(poolState) ? (
                  'Add Liquidity'
                ) : (
                  'Create Pool'
                )

              return (
                <_Add
                  chainId={chainId}
                  setChainId={(chainId) => {
                    router.push(`/add/v2/${chainId}`, `/add/v2/${chainId}`, { shallow: true })
                    setChainId(chainId)
                  }}
                  fee={fee}
                  setFee={setFee}
                  pool={pool}
                  poolState={poolState}
                  tridentPoolIfCreate={tridentPoolIfCreate}
                  title={title}
                  token0={token0}
                  token1={token1}
                  setToken0={setToken0}
                  setToken1={setToken1}
                  poolType={poolType}
                  setPoolType={setPoolType}
                />
              )
            }}
          </PoolFinder>
        </div>
      </Layout>
    </SWRConfig>
  )
}

interface AddProps {
  chainId: ChainId
  setChainId(chainId: ChainId): void
  fee: number
  setFee(fee: number): void
  pool: Pair | ConstantProductPool | StablePool | null
  poolState: PairState | ConstantProductPoolState | StablePoolState
  tridentPoolIfCreate: boolean
  title: ReactNode
  token0: Type | undefined
  token1: Type | undefined
  setToken0: Dispatch<SetStateAction<Type | undefined>>
  setToken1: Dispatch<SetStateAction<Type | undefined>>
  poolType: PoolFinderType
  setPoolType(type: PoolFinderType): void
}

const _Add: FC<AddProps> = ({
  chainId,
  setChainId,
  fee,
  setFee,
  pool,
  poolState,
  tridentPoolIfCreate,
  title,
  token0,
  token1,
  setToken0,
  setToken1,
  poolType,
  setPoolType,
}) => {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const [permit, setPermit] = useState<Signature>()

  const [{ input0, input1 }, setTypedAmounts] = useState<{
    input0: string
    input1: string
  }>({ input0: '', input1: '' })

  const [parsedInput0, parsedInput1] = useMemo(() => {
    return [tryParseAmount(input0, token0), tryParseAmount(input1, token1)]
  }, [input0, input1, token0, token1])

  const onChangeToken0TypedAmount = useCallback(
    (value: string) => {
      if (
        poolState === PairState.NOT_EXISTS ||
        poolState === ConstantProductPoolState.NOT_EXISTS ||
        poolState === StablePoolState.NOT_EXISTS
      ) {
        setTypedAmounts((prev) => ({
          ...prev,
          input0: value,
        }))
      } else if (token0 && pool) {
        const parsedAmount = tryParseAmount(value, token0)
        setTypedAmounts({
          input0: value,
          input1: parsedAmount ? pool.priceOf(token0.wrapped).quote(parsedAmount.wrapped).toExact() : '',
        })
      }
    },
    [pool, poolState, token0]
  )

  const onChangeToken1TypedAmount = useCallback(
    (value: string) => {
      if (
        poolState === PairState.NOT_EXISTS ||
        poolState === ConstantProductPoolState.NOT_EXISTS ||
        poolState === StablePoolState.NOT_EXISTS
      ) {
        setTypedAmounts((prev) => ({
          ...prev,
          input1: value,
        }))
      } else if (token1 && pool) {
        const parsedAmount = tryParseAmount(value, token1)
        setTypedAmounts({
          input0: parsedAmount ? pool.priceOf(token1.wrapped).quote(parsedAmount.wrapped).toExact() : '',
          input1: value,
        })
      }
    },
    [pool, poolState, token1]
  )

  useEffect(() => {
    if (pool) {
      onChangeToken0TypedAmount(input0)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChangeToken0TypedAmount])

  return (
    <div className="flex flex-col order-3 gap-[64px] pb-40 sm:order-2">
      <SelectNetworkWidget networks={SUPPORTED_CHAIN_IDS} selectedNetwork={chainId} onSelect={setChainId} />
      <SelectTokensWidget
        chainId={chainId}
        token0={token0}
        token1={token1}
        setToken0={setToken0}
        setToken1={setToken1}
      />
      {TRIDENT_ENABLED_NETWORKS.includes(chainId) && (
        <>
          <SelectPoolTypeWidget
            includeConcentrated={false}
            poolType={poolType}
            setPoolType={(type) => {
              setPoolType(type)
            }}
          />
          <SelectFeeWidget fee={fee} setFee={setFee} />
        </>
      )}

      <ContentBlock title={<span className="text-gray-900 dark:text-white">Deposit.</span>}>
        <div className="flex flex-col gap-4">
          <Web3Input.Currency
            id='add-liquidity-token0'
            type="INPUT"
            className="p-3 bg-white dark:bg-slate-800 rounded-xl"
            chainId={chainId}
            value={input0}
            onChange={onChangeToken0TypedAmount}
            onSelect={setToken0}
            currency={token0}
            disabled={!token0}
          />
          <div className="left-0 right-0 mt-[-24px] mb-[-24px] flex items-center justify-center">
            <button type="button" className="z-10 p-2 bg-gray-100 rounded-full dark:bg-slate-900">
              <PlusIcon strokeWidth={3} className="w-4 h-4 dark:text-slate-400 text-slate-600" />
            </button>
          </div>
          <Web3Input.Currency
            id='add-liquidity-token1'
            type="INPUT"
            className="p-3 bg-white dark:bg-slate-800 rounded-xl"
            chainId={chainId}
            value={input1}
            onChange={onChangeToken1TypedAmount}
            onSelect={setToken1}
            currency={token1}
            disabled={!token1}
            loading={
              poolState === PairState.LOADING ||
              poolState === ConstantProductPoolState.LOADING ||
              poolState === StablePoolState.LOADING
            }
          />
          <Checker.Connect fullWidth size="xl">
            <Checker.Network fullWidth size="xl" chainId={chainId}>
              <Checker.Amounts fullWidth size="xl" chainId={chainId} amounts={[parsedInput0, parsedInput1]}>
                {pool && (isConstantProductPool(pool) || isStablePool(pool)) && isBentoBoxV1ChainId(chainId) && (
                  <>
                    <Checker.ApproveBentobox
                      chainId={chainId}
                      id="add-liquidity-trident-approve-bentobox"
                      size="xl"
                      className="whitespace-nowrap"
                      fullWidth
                      contract={getTridentRouterContractConfig(chainId).address}
                      onSignature={setPermit}
                      enabled={Boolean(getTridentRouterContractConfig(chainId).address)}
                    >
                      <Checker.ApproveERC20
                        id="add-liquidity-trident-approve-token0"
                        size="xl"
                        className="whitespace-nowrap"
                        fullWidth
                        amount={parsedInput0}
                        contract={bentoBoxV1Address[chainId]}
                        enabled={isBentoBoxV1ChainId(chainId)}
                      >
                        <Checker.ApproveERC20
                          id="add-liquidity-trident-approve-token1"
                          size="xl"
                          className="whitespace-nowrap"
                          fullWidth
                          amount={parsedInput1}
                          contract={bentoBoxV1Address[chainId]}
                          enabled={isBentoBoxV1ChainId(chainId)}
                        >
                          <Button fullWidth onClick={() => setOpen(true)} size="xl" testdata-id='confirm-add-liquidity-button'>
                            {title}
                          </Button>
                        </Checker.ApproveERC20>
                      </Checker.ApproveERC20>
                    </Checker.ApproveBentobox>
                    <AddSectionReviewModalTrident
                      poolAddress={pool.liquidityToken.address}
                      // TODO: Shouldnt need to cast if this is done right
                      poolState={poolState as ConstantProductPoolState | StablePoolState}
                      pool={pool as ConstantProductPool | StablePool}
                      chainId={chainId}
                      token0={token0}
                      token1={token1}
                      input0={parsedInput0}
                      input1={parsedInput1}
                      open={open}
                      close={close}
                      permit={permit}
                      setPermit={setPermit}
                    />
                  </>
                )}
                {((pool && isLegacyPool(pool)) || (!pool && !tridentPoolIfCreate)) &&
                  isUniswapV2Router02ChainId(chainId) && (
                    <>
                      <Checker.ApproveERC20
                        id="approve-token-0"
                        size="xl"
                        className="whitespace-nowrap"
                        fullWidth
                        amount={parsedInput0}
                        contract={getSushiSwapRouterContractConfig(chainId).address as Address}
                      >
                        <Checker.ApproveERC20
                          id="approve-token-1"
                          size="xl"
                          className="whitespace-nowrap"
                          fullWidth
                          amount={parsedInput1}
                          contract={getSushiSwapRouterContractConfig(chainId).address as Address}
                        >
                          <Button fullWidth onClick={() => setOpen(true)} size="md" testdata-id='confirm-add-liquidity-button'>
                            {title}
                          </Button>
                        </Checker.ApproveERC20>
                      </Checker.ApproveERC20>
                      <AddSectionReviewModalLegacy
                        poolState={poolState as PairState}
                        chainId={chainId}
                        token0={token0}
                        token1={token1}
                        input0={parsedInput0}
                        input1={parsedInput1}
                        open={open}
                        close={close}
                      />
                    </>
                  )}
                {!pool && tridentPoolIfCreate && isBentoBoxV1ChainId(chainId) && (
                  <>
                    <Checker.ApproveBentobox
                      chainId={chainId}
                      id="create-trident-approve-bentobox"
                      size="xl"
                      className="whitespace-nowrap"
                      fullWidth
                      contract={getTridentRouterContractConfig(chainId).address}
                      onSignature={setPermit}
                      enabled={Boolean(getTridentRouterContractConfig(chainId).address)}
                    >
                      <Checker.ApproveERC20
                        id="create-trident-approve-token0"
                        size="xl"
                        className="whitespace-nowrap"
                        fullWidth
                        amount={parsedInput0}
                        contract={bentoBoxV1Address[chainId]}
                        enabled={isBentoBoxV1ChainId(chainId)}
                      >
                        <Checker.ApproveERC20
                          id="create-trident-approve-token1"
                          size="xl"
                          className="whitespace-nowrap"
                          fullWidth
                          amount={parsedInput1}
                          contract={bentoBoxV1Address[chainId]}
                          enabled={isBentoBoxV1ChainId(chainId)}
                        >
                          <Button fullWidth onClick={() => setOpen(true)} size="md" testdata-id='confirm-add-liquidity-button'>
                            {title}
                          </Button>
                        </Checker.ApproveERC20>
                      </Checker.ApproveERC20>
                    </Checker.ApproveBentobox>
                    <CreateSectionReviewModalTrident
                      chainId={chainId}
                      token0={token0}
                      token1={token1}
                      input0={parsedInput0}
                      input1={parsedInput1}
                      fee={FEE_MAP[fee]}
                      poolType={poolType}
                      open={open}
                      close={close}
                      permit={permit}
                      setPermit={setPermit}
                    />
                  </>
                )}
              </Checker.Amounts>
            </Checker.Network>
          </Checker.Connect>
        </div>
      </ContentBlock>
    </div>
  )
}

export default Add

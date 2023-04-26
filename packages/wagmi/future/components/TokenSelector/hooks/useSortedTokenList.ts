import { useDebounce } from '@sushiswap/hooks'
import { Amount, Native, Token, Type } from '@sushiswap/currency'
import { filterTokens, getSortedTokensByQuery, tokenComparator } from '../../../../hooks/useSortedTokensByQuery'
import { Fraction } from '@sushiswap/math'
import { useQuery } from '@tanstack/react-query'
import { ChainId } from '@sushiswap/chain'

interface Params {
  query: string
  chainId?: ChainId
  tokenMap: Record<string, Token> | undefined
  customTokenMap: Record<string, Token> | undefined
  pricesMap?: Record<string, Fraction>
  balancesMap?: Record<string, Amount<Type>>
  includeNative?: boolean
}

export const useSortedTokenList = ({
  query,
  chainId,
  tokenMap,
  customTokenMap,
  balancesMap,
  pricesMap,
  includeNative,
}: Params) => {
  const debouncedQuery = useDebounce(query, 250)

  return useQuery({
    queryKey: ['sortedTokenList', { debouncedQuery }],
    queryFn: async () => {
      const tokenMapValues = tokenMap ? Object.values(tokenMap) : []
      const customTokenMapValues = customTokenMap
        ? Object.values(customTokenMap).filter((el) => el.chainId === chainId)
        : []

      const _includeNative =
        includeNative &&
        chainId &&
        (!debouncedQuery || debouncedQuery.toLowerCase().includes(Native.onChain(chainId).symbol.toLowerCase()))

      const filteredTokens: Token[] = filterTokens(tokenMapValues, debouncedQuery)
      const sortedTokens: Token[] = [...filteredTokens].sort(tokenComparator(balancesMap, pricesMap))

      const filteredSortedTokens = getSortedTokensByQuery(sortedTokens, debouncedQuery)
      if (_includeNative) return [Native.onChain(chainId), ...customTokenMapValues, ...filteredSortedTokens]
      return filteredSortedTokens
    },
    keepPreviousData: true,
  })
}

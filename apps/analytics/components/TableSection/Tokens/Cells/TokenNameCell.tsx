import { Typography } from '@sushiswap/ui'
import { FC } from 'react'

import { ICON_SIZE } from '../constants'
import { Token } from '@sushiswap/graph-client'
import { Row } from 'components/TableSection/Common'
import { useTokenFromToken } from 'lib/hooks'
import { Currency } from '@sushiswap/ui/future/components/currency'

export const TokenNameCell: FC<Row<Token>> = ({ row }) => {
  const token = useTokenFromToken(row)

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-5 h-5">
        <Currency.Icon disableLink currency={token} width={ICON_SIZE} height={ICON_SIZE} />
      </div>
      <div className="flex flex-col">
        <Typography variant="sm" weight={500} className="flex items-center gap-1 text-slate-50">
          {token.symbol}
        </Typography>
        <Typography variant="xxs" className="text-slate-400">
          {token.name}
        </Typography>
      </div>
    </div>
  )
}

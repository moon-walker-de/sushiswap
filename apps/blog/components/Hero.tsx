import { FC } from 'react'
import { Article } from 'types'
import { Container } from '@sushiswap/ui/future/components/container'
import { Button } from '@sushiswap/ui/future/components/button'

import { ArticleAuthors, ArticleHeader } from './article'

interface Hero {
  article: Article
}

export const Hero: FC<Hero> = ({ article }) => {
  return (
    <section className="bg-gradient-to-b from-slate-900 via-slate-800/15 to-blue/5">
      <Container maxWidth="5xl" className="z-10 px-4 py-20 mx-auto">
        <div className="relative pt-10">
          <ArticleHeader article={article} />
          <ArticleAuthors article={article} />
          <div className="mt-8">
            <Button as="a" href={`/blog/${article?.attributes?.slug}`} color="blue">
              Read Article
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

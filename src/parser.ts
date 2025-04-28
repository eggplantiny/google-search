import type { SearchResultItem } from './types'
import { URL } from 'node:url'
import { extractContent } from '@wrtnlabs/web-content-extractor'

export function filterResult(linkUrl: string | undefined | null, includeGoogleLinks: boolean): string | null {
  if (!linkUrl) {
    return null
  }
  try {
    let actualLink = linkUrl
    if (actualLink.startsWith('/url?')) {
      const parsedUrl = new URL(actualLink, 'https://www.google.com')
      const q = parsedUrl.searchParams.get('q')
      if (q) {
        actualLink = q
      }
      else {
        return null
      }
    }
    const parsed = new URL(actualLink)
    if (!parsed.hostname) {
      return null
    }
    if (!includeGoogleLinks && parsed.hostname.includes('google')) {
      return null
    }
    if (parsed.pathname.startsWith('/search')
      || parsed.hostname.startsWith('webcache.googleusercontent')
      || parsed.hostname.startsWith('translate.google')) {
      return null
    }
    return actualLink
  }
  catch {
    return null
  }
}

export function parseHtml(
  html: string,
  includeGoogleLinks: boolean = false,
  seenLinks: Set<string> = new Set<string>(),
): SearchResultItem[] {
  // 현재 HTML 조각에서 콘텐츠 추출
  const { contentHtmls, links, content } = extractContent(html)

  if (!contentHtmls || contentHtmls.length === 0) {
    return []
  }

  if (contentHtmls.length === 1) {
    // Base Case: 하위 fragment가 없으면, 현재 레벨 결과만 반환하고 재귀 종료
    return links.reduce((acc: SearchResultItem[], linkObj) => {
      const filteredLink = filterResult(linkObj.url, includeGoogleLinks)

      if (filteredLink && !seenLinks.has(filteredLink)) {
        seenLinks.add(filteredLink) // 중복 방지를 위해 Set에 추가
        acc.push({
          link: filteredLink,
          title: linkObj.content ?? '',
          content: content ?? '',
        })
      }
      return acc
    }, [])
  }

  // Recursive Step: 하위 fragment들이 있으면 재귀 호출
  const nestedResults = contentHtmls.flatMap(fragmentHtml =>
    // 재귀 호출 시 옵션과 Set을 그대로 전달
    parseHtml(fragmentHtml, includeGoogleLinks, seenLinks),
  )

  // 현재 레벨 결과와 하위 레벨 결과를 합쳐서 반환
  return links.reduce((acc: SearchResultItem[], linkObj) => {
    const filteredLink = filterResult(linkObj.url, includeGoogleLinks)

    if (filteredLink && !seenLinks.has(filteredLink)) {
      seenLinks.add(filteredLink) // 중복 방지를 위해 Set에 추가
      acc.push({
        link: filteredLink,
        title: linkObj.content ?? '',
        content: content ?? '',
      })
    }
    return acc.concat(nestedResults)
  }, [])
}

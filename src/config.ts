export const config = {
  urls: {
    home: 'https://www.google.%(tld)s/',
    search: 'https://www.google.%(tld)s/search?lr=lang_%(lang)s&q=%(query)s&btnG=Google+Search&tbs=%(tbs)s&safe=%(safe)s&cr=%(country)s&filter=0',
    searchNum: 'https://www.google.%(tld)s/search?lr=lang_%(lang)s&q=%(query)s&num=%(num)d&btnG=Google+Search&tbs=%(tbs)s&safe=%(safe)s&cr=%(country)s&filter=0',
    nextPage: 'https://www.google.%(tld)s/search?lr=lang_%(lang)s&q=%(query)s&start=%(start)d&tbs=%(tbs)s&safe=%(safe)s&cr=%(country)s&filter=0',
    nextPageNum: 'https://www.google.%(tld)s/search?lr=lang_%(lang)s&q=%(query)s&num=%(num)d&start=%(start)d&tbs=%(tbs)s&safe=%(safe)s&cr=%(country)s&filter=0',
  },
  defaultUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  // user_agents.txt 로딩은 userAgentProvider.ts 에서 처리
  urlParameters: [
    'hl',
    'q',
    'num',
    'btnG',
    'start',
    'tbs',
    'safe',
    'cr',
    'filter',
  ],
}

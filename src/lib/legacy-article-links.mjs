// @ts-check
// Verified migrations only: keys are original URLs, values are rendered destinations.
// Keep historical Markdown untouched and avoid guessing at new or ambiguous links.
/** @type {Record<string, Record<string, string>>} */
const repairs = {
  'kikinvb-yt': { '#华东师大电信学部': '#华东师大信息学部' },
  'le-yt': { "#Le's-Pre-Recommendation-Experiences": '#article-title' },
  'haatohaaton-yt': {
    '#Haatohaaton': '#article-title',
    '#后记&联系方式': '#后记联系方式',
  },
  'feather1023-yt': {
    '#“佛系”保研经验分享': '#article-title',
    '#浙江大学': '#1-浙江大学',
    '#东南大学': '#2-东南大学',
    '#Q&A': '#3-qa',
  },
  'klein-yt': { '#record-of-yutuimian': '#article-title' },
  'ccandtt-yt': {
    '#末二低RK的保研之路': '#article-title',
    '##目录': '#目录',
    '##摘要': '#摘要',
    '##个人BG': '#个人bg',
    '##预推免流水账': '#预推免流水账',
    '###thu-生信': '#thu-生信',
    '###xmu-CS': '#xmu-cs',
    '###fdu-cs': '#fdu-cs',
    '##总结篇': '#总结篇',
    '##咨询&联系方式': '#咨询联系方式',
  },
  'klein-sc': {
    '#record-of-summer-camp': '#article-title',
    './中山大学-软件学院/中山大学-论文研读范围/': 'https://github.com/kleinblue4/Record-of-Klein-s-25-BaoYan/tree/main/SummerCamp/中山大学-软件学院/中山大学-论文研读范围',
    './南京航空航天大学/': 'https://github.com/kleinblue4/Record-of-Klein-s-25-BaoYan/tree/main/SummerCamp/南京航空航天大学',
  },
  'yuzi-yt': { "#Yuzi's-Pre-Recommendation-Experiences": '#article-title' },
  'leo-yt': {
    '#东南大学-SE': '#东南大学-se',
    '#南京大学-SE': '#南京大学-se',
    '#西安交通大学-SE': '#西安交通大学-se',
  },
  'mkk-sc': {
    // The original has no school-group heading; its first school starts this section.
    '#各院校参与情况': '#1-厦门大学',
    '#3-电子科技大学深圳研究院': '#2-电子科技大学深圳研究院',
    '#2-东南大学': '#3-东南大学',
  },
  'xxy-yt': {
    '#2-南京理工大学': '#1-南京理工大学',
    '#3-湖南大学': '#2-湖南大学',
    '#4-大连理工大学': '#3-大连理工大学',
    '#5-北京邮电大学': '#4-北京邮电大学',
  },
};

// Checked on 2026-10-12. Keep the original URLs, including their query strings.
/** @type {Record<string, readonly string[]>} */
const unavailableNotices = {
  'klein-sc': [
    'https://informatics.xmu.edu.cn/info/1050/45710.htm',
    'https://soft.buaa.edu.cn/news_nry.jsp?urltype=news.NewsContentUrl&wbtreeid=1117&wbnewsid=11912',
  ],
  'lulu-sc': ['https://see.tongji.edu.cn/info/1147/13909.htm'],
};

/** @type {Record<string, readonly string[]>} */
const misdirectedNotices = {
  'lulu-sc': ['https://ga.sjtu.edu.cn/zsgl/xxgs/xlyhdbfmx.aspx'],
};

/** @type {import('satteri').HastPluginEntry} */
export const legacyArticleLinks = ({ fileURL }) => {
  const match = fileURL?.pathname.match(/\/src\/content\/experiences\/2025\/([^/]+)\/index\.md$/);
  if (!match) return null;
  const links = Object.hasOwn(repairs, match[1]) ? repairs[match[1]] : {};
  const unavailable = Object.hasOwn(unavailableNotices, match[1]) ? unavailableNotices[match[1]] : [];
  const misdirected = Object.hasOwn(misdirectedNotices, match[1]) ? misdirectedNotices[match[1]] : [];
  /** @type {string | undefined} */
  let titleId;
  return {
    name: 'legacy-article-links',
    element: {
      filter: ['h1', 'a'],
      visit(node, ctx) {
        if (node.tagName === 'h1') {
          const id = node.properties?.id;
          if (typeof id === 'string') titleId ??= id;
          return;
        }
        const href = node.properties?.href;
        if (typeof href !== 'string') return;
        let decoded;
        try { decoded = decodeURIComponent(href); } catch { return; }
        const expired = unavailable.includes(decoded);
        if (expired || misdirected.includes(decoded)) {
          ctx.insertAfter(node, {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['legacy-link-status'],
              title: expired ? '2026-10-12 核对时返回 404，保留原始通知链接。'
                : '2026-10-12 核对：此链接实际指向上海交通大学夏令营活动办法，保留原始链接。',
            },
            children: [{ type: 'text', value: expired ? '（原链接已失效）' : '（链接指向上海交通大学）' }],
          });
          return;
        }
        // The Markdown's first H1 is hidden to avoid duplicating the layout title.
        const destination = decoded === `#${titleId}` ? '#article-title'
          : Object.hasOwn(links, decoded) ? links[decoded] : undefined;
        if (destination) ctx.setProperty(node, 'href', destination);
      },
    },
  };
};

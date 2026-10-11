import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { experiencePath, getExperiences, sortByCollectedAt } from '../lib/experiences';

export async function GET(context) {
  const experiences = await getExperiences();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: sortByCollectedAt(experiences).map((entry) => ({
      title: entry.data.title,
      description: `${entry.data.applicationYear} 年保研经验 · ${entry.data.author}`,
      pubDate: entry.collectedAt,
      link: experiencePath(entry),
    })),
  });
}


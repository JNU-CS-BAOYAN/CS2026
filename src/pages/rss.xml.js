import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { experiencePath, sortExperiences } from '../lib/experiences';

export async function GET(context) {
  const experiences = await getCollection('experiences');
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: sortExperiences(experiences).map((entry) => ({
      title: entry.data.title,
      description: `${entry.data.applicationYear} 年保研经验 · ${entry.data.author}`,
      pubDate: entry.data.publishedAt,
      link: experiencePath(entry),
    })),
  });
}


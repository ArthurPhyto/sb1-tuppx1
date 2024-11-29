import axios from 'axios';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import { lookupDomain } from './domainChecker.js';
import { extractDomain, isValidUrl, isSameDomain } from './utils.js';

const crawledUrls = new Set();
const foundDomains = new Set();
const externalSites = new Set();

export async function startCrawler(startUrl, callbacks) {
  const { onUrlCrawled, onExpiredDomain, onExternalSite, onStats } = callbacks;
  
  if (!isValidUrl(startUrl)) {
    throw new Error('URL invalide');
  }

  const baseDomain = extractDomain(startUrl);
  await crawlUrl(startUrl, baseDomain, { onUrlCrawled, onExpiredDomain, onExternalSite, onStats });
}

async function crawlUrl(url, baseDomain, callbacks) {
  const { onUrlCrawled, onExpiredDomain, onExternalSite, onStats } = callbacks;
  
  if (crawledUrls.has(url)) return;
  crawledUrls.add(url);

  // Envoyer les statistiques mises à jour
  onStats({
    crawledCount: crawledUrls.size,
    externalCount: externalSites.size
  });

  try {
    console.log(chalk.blue(`Crawling: ${url}`));
    onUrlCrawled(url);

    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DomainCrawler/1.0)'
      }
    });
    
    const $ = cheerio.load(response.data);

    const links = new Set($('a')
      .map((_, element) => {
        const href = $(element).attr('href');
        if (!href) return null;
        
        try {
          const absoluteUrl = new URL(href, url).href;
          return absoluteUrl;
        } catch {
          return null;
        }
      })
      .get()
      .filter(href => href && isValidUrl(href)));

    for (const link of links) {
      const domain = extractDomain(link);
      
      if (!domain) continue;

      // Gestion des sites externes
      if (!isSameDomain(domain, baseDomain)) {
        if (!externalSites.has(domain)) {
          externalSites.add(domain);
          onExternalSite({
            domain,
            url: link
          });

          // Vérifier si le domaine est expiré
          const isExpired = await lookupDomain(domain);
          if (isExpired) {
            console.log(chalk.green(`Domaine expiré trouvé: ${domain}`));
            onExpiredDomain(domain);
          }
        }
        continue;
      }

      // Crawler récursivement uniquement les URLs du même domaine
      if (isSameDomain(domain, baseDomain)) {
        await crawlUrl(link, baseDomain, callbacks);
      }
    }
  } catch (error) {
    console.error(chalk.red(`Erreur lors du crawl de ${url}: ${error.message}`));
  }
}
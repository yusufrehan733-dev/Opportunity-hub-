import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL || '';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export const config = {
  runtime: 'edge',
};

function clean(value: any) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function absoluteUrl(
  value: string,
  baseUrl: string
) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

function isUsefulContactUrl(url: string) {
  const value = clean(url).toLowerCase();

  if (!value) {
    return false;
  }

  if (
    value.includes('whatsapp.com') ||
    value.includes('wa.me') ||
    value.includes('t.me') ||
    value.includes('telegram.me') ||
    value.includes('linkedin.com/in/') ||
    value.includes('linkedin.com/company/') ||
    value.includes('instagram.com/') ||
    value.includes('facebook.com/') ||
    value.includes('x.com/') ||
    value.includes('twitter.com/')
  ) {
    return true;
  }

  const contactWords = [
    'contact',
    'contact-us',
    'contactus',
    'get-in-touch',
    'reach-us',
    'reachout',
    'message',
  ];

  return contactWords.some((word) =>
    value.includes(word)
  );
}

function extractEmail(html: string) {
  const match = html.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match
    ? match[0].replace(/[),.;:]+$/, '')
    : '';
}

function extractPhone(html: string) {
  const matches =
    html.match(
      /(?:\+?\d[\d\s().-]{7,}\d)/g
    ) || [];

  for (const value of matches) {
    const phone = value.trim();

    const digits = phone.replace(
      /\D/g,
      ''
    );

    if (
      digits.length >= 8 &&
      digits.length <= 15
    ) {
      return phone;
    }
  }

  return '';
}

function extractContactUrl(
  html: string,
  pageUrl: string
) {
  const hrefMatches =
    html.match(
      /href\s*=\s*["']([^"']+)["']/gi
    ) || [];

  for (const raw of hrefMatches) {
    const match = raw.match(
      /href\s*=\s*["']([^"']+)["']/i
    );

    if (!match) {
      continue;
    }

    const url = absoluteUrl(
      decodeHtml(match[1]),
      pageUrl
    );

    if (isUsefulContactUrl(url)) {
      return url;
    }
  }

  return '';
}

function extractSocialUrl(
  html: string,
  pageUrl: string
) {
  const hrefMatches =
    html.match(
      /href\s*=\s*["']([^"']+)["']/gi
    ) || [];

  for (const raw of hrefMatches) {
    const match = raw.match(
      /href\s*=\s*["']([^"']+)["']/i
    );

    if (!match) {
      continue;
    }

    const url = absoluteUrl(
      decodeHtml(match[1]),
      pageUrl
    );

    if (
      /(?:linkedin\.com|instagram\.com|facebook\.com|t\.me|telegram\.me|wa\.me|whatsapp\.com|x\.com|twitter\.com)/i.test(
        url
      )
    ) {
      return url;
    }
  }

  return '';
}

function pageHasContactForm(
  html: string
) {
  const text = html.toLowerCase();

  return (
    text.includes('<form') &&
    (
      text.includes('contact') ||
      text.includes('message') ||
      text.includes('enquiry') ||
      text.includes('inquiry')
    )
  );
}

function extractCountry(
  query: string,
  text: string
) {
  const countries = [
    'United States',
    'USA',
    'US',
    'Canada',
    'United Kingdom',
    'UK',
    'UAE',
    'United Arab Emirates',
    'Qatar',
    'Saudi Arabia',
    'Kuwait',
    'Oman',
    'Bahrain',
    'Australia',
    'Norway',
    'Finland',
    'Pakistan',
    'India',
    'Bangladesh',
  ];

  const combined =
    `${query} ${text}`.toLowerCase();

  for (const country of countries) {
    if (
      combined.includes(
        country.toLowerCase()
      )
    ) {
      return country;
    }
  }

  return 'Global';
}

function extractSkill(
  query: string,
  text: string
) {
  const skills = [
    'Quran',
    'Tajweed',
    'Tafseer',
    'Fiqh',
    'Hifz',
    'Qirat',
    'Arabic',
    'English',
    'Math',
    'Science',
    'Teaching',
    'Tutor',
    'Coaching',
    'Freelancing',
    'Consulting',
  ];

  const combined =
    `${query} ${text}`.toLowerCase();

  for (const skill of skills) {
    if (
      combined.includes(
        skill.toLowerCase()
      )
    ) {
      return skill;
    }
  }

  return 'General';
}

async function inspectSource(
  sourceUrl: string
) {
  if (!sourceUrl) {
    return {
      email: '',
      phone: '',
      contactUrl: '',
      sourceUrl: '',
    };
  }

  try {
    const response = await fetch(
      sourceUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 OpportunityHub/1.0',
          Accept:
            'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      return {
        email: '',
        phone: '',
        contactUrl: '',
        sourceUrl,
      };
    }

    const html =
      await response.text();

    const email =
      extractEmail(html);

    const phone =
      extractPhone(html);

    const contactUrl =
      extractContactUrl(
        html,
        sourceUrl
      );

    const socialUrl =
      extractSocialUrl(
        html,
        sourceUrl
      );

    const formExists =
      pageHasContactForm(html);

    return {
      email,
      phone,
      contactUrl:
        contactUrl ||
        socialUrl ||
        (formExists
          ? sourceUrl
          : ''),
      sourceUrl,
    };
  } catch {
    return {
      email: '',
      phone: '',
      contactUrl: '',
      sourceUrl,
    };
  }
}

function hasDirectContact(
  email: string,
  phone: string,
  contactUrl: string
) {
  return Boolean(
    clean(email) ||
    clean(phone) ||
    clean(contactUrl)
  );
}

export default async function handler(
  req: Request
) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error:
          'Method not allowed',
      }),
      {
        status: 405,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  }

  try {
    const body =
      await req.json();

    const query =
      clean(body?.query);

    const rssUrl =
      clean(body?.rssUrl);

    const subreddit =
      clean(body?.subreddit);

    const twentyFourHoursAgo =
      new Date(
        Date.now() -
          24 * 60 * 60 * 1000
      );

    const leadsToInsert: any[] =
      [];

    /*
     * =========================
     * GOOGLE SERPER
     * =========================
     */

    if (
      query &&
      process.env.SERPER_API_KEY
    ) {
      const response =
        await fetch(
          'https://google.serper.dev/search',
          {
            method: 'POST',
            headers: {
              'X-API-KEY':
                process.env.SERPER_API_KEY,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              q: query,
              tbs: 'qdr:d',
              num: 10,
            }),
          }
        );

      const data =
        await response.json();

      if (
        Array.isArray(
          data?.organic
        )
      ) {
        for (
          const item of data.organic
        ) {
          const sourceUrl =
            clean(item.link);

          if (!sourceUrl) {
            continue;
          }

          const inspected =
            await inspectSource(
              sourceUrl
            );

          const combinedText =
            `${item.title || ''} ${item.snippet || ''}`;

          const skill =
            extractSkill(
              query,
              combinedText
            );

          const country =
            extractCountry(
              query,
              combinedText
            );

          /*
           * A search result without
           * direct contact evidence
           * is NOT a lead.
           */
          if (
            !hasDirectContact(
              inspected.email,
              inspected.phone,
              inspected.contactUrl
            )
          ) {
            continue;
          }

          leadsToInsert.push({
            type: 'Demand',
            source:
              'Google (Serper)',
            source_url:
              inspected.sourceUrl,
            client_name:
              item.title ||
              'Opportunity',
            skill_needed:
              skill,
            description:
              item.snippet || '',
            contact_email:
              inspected.email ||
              null,
            contact_phone:
              inspected.phone ||
              null,
            contact_url:
              inspected.contactUrl ||
              null,
            created_at:
              new Date().toISOString(),
            status: 'new',
            title:
              item.title ||
              'Opportunity',
            category:
              'Demand',
            subcategory:
              skill,
            country,
            city: null,
            budget: null,
            currency: null,
            contact_name: null,
          });
        }
      }
    }

    /*
     * =========================
     * RSS
     * =========================
     */

    if (rssUrl) {
      const rssResponse =
        await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
            rssUrl
          )}`
        );

      const rssData =
        await rssResponse.json();

      if (
        Array.isArray(
          rssData?.items
        )
      ) {
        for (
          const item of rssData.items
        ) {
          const pubDate =
            new Date(
              item.pubDate
            );

          if (
            pubDate <
            twentyFourHoursAgo
          ) {
            continue;
          }

          const sourceUrl =
            clean(
              item.link
            );

          const inspected =
            await inspectSource(
              sourceUrl
            );

          const text =
            `${item.title || ''} ${item.description || ''}`;

          const skill =
            extractSkill(
              '',
              text
            );

          const country =
            extractCountry(
              '',
              text
            );

          if (
            !hasDirectContact(
              inspected.email,
              inspected.phone,
              inspected.contactUrl
            )
          ) {
            continue;
          }

          leadsToInsert.push({
            type: 'Demand',
            source:
              `RSS: ${
                rssData.feed?.title ||
                'Feed'
              }`,
            source_url:
              inspected.sourceUrl,
            client_name:
              item.title ||
              'Opportunity',
            skill_needed:
              skill,
            description:
              item.description ||
              item.content ||
              '',
            contact_email:
              inspected.email ||
              null,
            contact_phone:
              inspected.phone ||
              null,
            contact_url:
              inspected.contactUrl ||
              null,
            created_at:
              pubDate.toISOString(),
            status: 'new',
            title:
              item.title ||
              'Opportunity',
            category:
              'Demand',
            subcategory:
              skill,
            country,
            city: null,
            budget: null,
            currency: null,
            contact_name: null,
          });
        }
      }
    }

    /*
     * =========================
     * REDDIT
     * =========================
     */

    if (subreddit) {
      const redditResponse =
        await fetch(
          `https://www.reddit.com/r/${subreddit}/new.json?limit=10`,
          {
            headers: {
              'User-Agent':
                'OpportunityHubBot/1.0',
            },
          }
        );

      const redditData =
        await redditResponse.json();

      if (
        Array.isArray(
          redditData?.data?.children
        )
      ) {
        for (
          const post
          of redditData.data.children
        ) {
          const postData =
            post.data;

          const createdDate =
            new Date(
              postData.created_utc *
                1000
            );

          if (
            createdDate <
            twentyFourHoursAgo
          ) {
            continue;
          }

          /*
           * A Reddit post itself can
           * be actionable when the
           * author can be contacted
           * through the post.
           */
          const sourceUrl =
            postData.permalink
              ? `https://www.reddit.com${postData.permalink}`
              : '';

          if (!sourceUrl) {
            continue;
          }

          const text =
            `${postData.title || ''} ${postData.selftext || ''}`;

          const skill =
            extractSkill(
              '',
              text
            );

          const country =
            extractCountry(
              '',
              text
            );

          /*
           * Reddit gives us a direct
           * post URL where the user
           * can contact the requester.
           */
          leadsToInsert.push({
            type: 'Demand',
            source:
              `Reddit: r/${subreddit}`,
            source_url:
              sourceUrl,
            client_name:
              postData.title ||
              'Reddit Opportunity',
            skill_needed:
              skill,
            description:
              postData.selftext ||
              'Reddit opportunity',
            contact_email: null,
            contact_phone: null,
            contact_url:
              sourceUrl,
            created_at:
              createdDate.toISOString(),
            status: 'new',
            title:
              postData.title ||
              'Opportunity',
            category:
              'Demand',
            subcategory:
              skill,
            country,
            city: null,
            budget: null,
            currency: null,
            contact_name:
              postData.author ||
              null,
          });
        }
      }
    }

    /*
     * =========================
     * REMOVE DUPLICATES
     * =========================
     */

    const uniqueLeads =
      Array.from(
        new Map(
          leadsToInsert.map(
            (lead) => [
              lead.source_url ||
                `${lead.title}-${lead.created_at}`,
              lead,
            ]
          )
        ).values()
      );

    /*
     * =========================
     * INSERT
     * =========================
     */

    if (
      uniqueLeads.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          message:
            'No new actionable leads found',
        }),
        {
          status: 200,
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    const { error } =
      await supabase
        .from('demand_leads')
        .insert(
          uniqueLeads
        );

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count:
          uniqueLeads.length,
        message:
          'Actionable leads collected',
      }),
      {
        status: 200,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error(
      'Lead collector error:',
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        count: 0,
        error:
          error?.message ||
          'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { query, rssUrl, subreddit } = await req.json();

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const leadsToInsert: any[] = [];

    // =========================
    // GOOGLE SERPER
    // =========================

    if (query && process.env.SERPER_API_KEY) {
      const response = await fetch(
        'https://google.serper.dev/search',
        {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            tbs: 'qdr:d',
          }),
        }
      );

      const data = await response.json();

      if (data.organic) {
        for (const item of data.organic) {
          leadsToInsert.push({
            type: 'Demand',
            source: 'Google (Serper)',
            client_name: item.title || 'Google Opportunity',
            skill_needed: 'General',
            description: item.snippet || '',
            contact_email: null,
            contact_phone: null,
            created_at: new Date().toISOString(),
            status: 'new',
            title: item.title || 'Opportunity',
            category: 'Google',
            subcategory: 'Search',
            country: 'Global',
            city: null,
            budget: null,
            currency: null,
            contact_name: null,
          });
        }
      }
    }

    // =========================
    // RSS
    // =========================

    if (rssUrl) {
      const rssResponse = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
          rssUrl
        )}`
      );

      const rssData = await rssResponse.json();

      if (rssData.items) {
        for (const item of rssData.items) {
          const pubDate = new Date(item.pubDate);

          if (pubDate >= twentyFourHoursAgo) {
            leadsToInsert.push({
              type: 'Demand',
              source: `RSS: ${rssData.feed?.title || 'Feed'}`,
              client_name: item.title || 'RSS Opportunity',
              skill_needed: 'General',
              description:
                item.description ||
                item.content ||
                '',
              contact_email: null,
              contact_phone: null,
              created_at: pubDate.toISOString(),
              status: 'new',
              title: item.title || 'Opportunity',
              category: 'Remote Jobs',
              subcategory: 'RSS',
              country: 'Global',
              city: null,
              budget: null,
              currency: null,
              contact_name: null,
            });
          }
        }
      }
    }

    // =========================
    // REDDIT
    // =========================

    if (subreddit) {
      const redditResponse = await fetch(
        `https://www.reddit.com/r/${subreddit}/new.json?limit=10`,
        {
          headers: {
            'User-Agent': 'OpportunityHubBot/1.0',
          },
        }
      );

      const redditData = await redditResponse.json();

      if (redditData?.data?.children) {
        for (const post of redditData.data.children) {
          const postData = post.data;

          const createdDate = new Date(
            postData.created_utc * 1000
          );

          if (createdDate >= twentyFourHoursAgo) {
            leadsToInsert.push({
              type: 'Demand',
              source: `Reddit: r/${subreddit}`,
              client_name: postData.title || 'Reddit Opportunity',
              skill_needed: 'General',
              description:
                postData.selftext || 'Reddit opportunity',
              contact_email: null,
              contact_phone: null,
              created_at: createdDate.toISOString(),
              status: 'new',
              title: postData.title || 'Opportunity',
              category: 'Reddit',
              subcategory: subreddit,
              country: 'Global',
              city: null,
              budget: null,
              currency: null,
              contact_name: null,
            });
          }
        }
      }
    }

    // =========================
    // INSERT INTO SUPABASE
    // =========================

    if (leadsToInsert.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          message: 'No new leads found',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { error } = await supabase
      .from('demand_leads')
      .insert(leadsToInsert);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: leadsToInsert.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Lead collector error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

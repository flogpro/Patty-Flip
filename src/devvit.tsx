/**
 * Blocks entry: custom post shell (webview → built client).
 * Subreddit “create post” action is defined in devvit.json `menu` and handled
 * by the Devvit Web server (UiResponse + submitCustomPost).
 * @see https://developers.reddit.com/docs/capabilities/client/menu-actions
 */
import { Devvit } from '@devvit/public-api';

Devvit.addCustomPostType({
  name: 'Patty Flipper',
  description: 'Play Patty Flipper – flip patties, score points, and climb the leaderboard.',
  height: 'tall',
  render: (_context) => {
    return (
      <vstack height="100%" width="100%" grow>
        <webview url="index.html" height="100%" width="100%" grow />
      </vstack>
    );
  },
});

export default {};

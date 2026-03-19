/**
 * Blocks entry point: registers the custom post type and a subreddit menu item
 * so users can create a Patty Flipper post from the subreddit "..." menu.
 */
import { Devvit, RunAs } from '@devvit/public-api';

Devvit.addCustomPostType({
  name: 'Patty Flipper',
  description: 'Play Patty Flipper – flip patties, score points, and climb the leaderboard.',
  height: 'tall',
  render: (context) => {
    return (
      <vstack height="100%" width="100%" grow>
        <webview url="index.html" height="100%" width="100%" grow />
      </vstack>
    );
  },
});

Devvit.addMenuItem({
  label: 'Create Patty Flipper post',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const subredditName = await context.reddit.getCurrentSubredditName();
    await context.reddit.submitPost({
      subredditName,
      title: 'Patty Flipper',
      runAs: RunAs.USER,
      userGeneratedContent: { text: 'Play Patty Flipper!' },
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading Patty Flipper…</text>
        </vstack>
      ),
    });
    context.ui.showToast('Patty Flipper post created!');
  },
});

export default {};

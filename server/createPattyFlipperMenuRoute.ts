/**
 * Devvit Web subreddit menu action: create a Patty Flipper custom post via
 * submitCustomPost (no Blocks / addCustomPostType — see Devvit changelog).
 * @see https://developers.reddit.com/docs/capabilities/client/menu-actions
 */
import type { Express, Request, Response } from 'express';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';

export function registerCreatePattyFlipperMenuRoute(app: Express): void {
  app.post('/internal/menu/create-patty-flipper-post', async (req: Request, res: Response) => {
    const input = req.body as MenuItemRequest;
    if (input?.location && input.location !== 'subreddit') {
      res.json({
        showToast: { text: 'Use this action from the subreddit menu.', appearance: 'neutral' },
      } satisfies UiResponse);
      return;
    }
    try {
      const subredditName = context.subredditName;
      if (!subredditName) {
        res.json({
          showToast: { text: 'Missing subreddit context.', appearance: 'neutral' },
        } satisfies UiResponse);
        return;
      }

      await reddit.submitCustomPost({
        subredditName,
        title: 'Patty Flipper',
        entry: 'default',
        runAs: 'USER',
        userGeneratedContent: { text: 'Play Patty Flipper!' },
        textFallback: { text: 'Patty Flipper — open this post to play.' },
      });

      res.json({
        showToast: { text: 'Patty Flipper post created!', appearance: 'success' },
      } satisfies UiResponse);
    } catch (e) {
      console.error('menu create-patty-flipper-post', e);
      res.json({
        showToast: { text: 'Could not create post. Try again.', appearance: 'neutral' },
      } satisfies UiResponse);
    }
  });
}

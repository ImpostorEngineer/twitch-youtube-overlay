import { addToQueue, canUserRequest, getCurrent, skip } from '@/lib/queue';
import { extractVideoId, searchYoutubeVideos } from '@/lib/youtube';

function createTwitchState() {
  return {
    started: false,
    client: null,
    starting: null,
  };
}

const state = globalThis.__twitchChatState || createTwitchState();

if (!globalThis.__twitchChatState) {
  globalThis.__twitchChatState = state;
}

function hasTwitchConfig() {
  return process.env.TWITCH_CHANNEL;
}

function normalizeToken(token) {
  if (!token) {
    return token;
  }

  return token.startsWith('oauth:') ? token : `oauth:${token}`;
}

function canReplyInChat(client) {
  return Boolean(client?.getOptions?.().identity?.password);
}

function replyIfPossible(client, channel, message) {
  if (!canReplyInChat(client)) {
    return;
  }

  client.say(channel, message);
}

async function resolveRequestedVideo(input) {
  const directVideoId = extractVideoId(input);

  if (directVideoId) {
    return {
      videoId: directVideoId,
      title: `Requested video ${directVideoId}`,
      thumbnail: `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
    };
  }

  return searchYoutubeVideos(input);
}

async function handleSongRequest(channel, client, userName, query) {
  if (!query) {
    replyIfPossible(client, channel, `@${userName} use !sr <search or youtube url>`);
    return;
  }

  if (!canUserRequest(userName)) {
    replyIfPossible(client, channel, `@${userName} please wait a few seconds before requesting again.`);
    return;
  }

  const video = await resolveRequestedVideo(query);

  if (!video) {
    replyIfPossible(client, channel, `@${userName} no playable YouTube result found.`);
    return;
  }

  const result = addToQueue(video, {
    requestedBy: userName,
    source: 'twitch',
  });

  if (!result.added) {
    const message =
      result.reason === 'duplicate'
        ? 'that song is already in the queue.'
        : result.reason === 'user_limit'
          ? 'you already have too many queued songs.'
          : 'the queue is full right now.';

    replyIfPossible(client, channel, `@${userName} ${message}`);
    return;
  }

  replyIfPossible(client, channel, `@${userName} queued: ${video.title}`);
}

async function handleCommand(channel, client, tags, message) {
  const [command, ...parts] = message.trim().split(/\s+/);
  const query = parts.join(' ').trim();
  const userName = tags['display-name'] || tags.username || 'viewer';

  if (command === '!sr') {
    await handleSongRequest(channel, client, userName, query);
  }

  if (command === '!skip') {
    skip();
    const current = getCurrent();
    replyIfPossible(client, channel, `Skipped. Now playing: ${current?.title || 'nothing queued'}`);
  }

  if (command === '!song') {
    const current = getCurrent();
    replyIfPossible(client, channel, `Now playing: ${current?.title || 'nothing queued'}`);
  }
}

export function ensureTwitchService() {
  if (state.started || state.starting || !hasTwitchConfig()) {
    return state.client;
  }

  state.starting = (async () => {
    try {
      const tmiModule = await import('tmi.js');
      const tmi = tmiModule.default || tmiModule;
      const username = process.env.TWITCH_USERNAME;
      const token = normalizeToken(process.env.TWITCH_OAUTH_TOKEN);
      const clientOptions = {
        channels: [process.env.TWITCH_CHANNEL],
      };

      if (username && token) {
        clientOptions.identity = {
          username,
          password: token,
        };
      }

      const client = new tmi.Client(clientOptions);

      client.on('message', async (channel, tags, message, self) => {
        if (self || !message.startsWith('!')) {
          return;
        }

        try {
          await handleCommand(channel, client, tags, message);
        } catch (error) {
          replyIfPossible(
            client,
            channel,
            `@${tags['display-name'] || tags.username || 'viewer'} request failed: ${error.message}`
          );
        }
      });

      client.on('connected', () => {
        const mode = canReplyInChat(client) ? 'authenticated' : 'read-only';
        console.log(`Connected to Twitch channel ${process.env.TWITCH_CHANNEL} in ${mode} mode`);
      });

      await client.connect();
      state.client = client;
      state.started = true;
    } catch (error) {
      console.error('Failed to start Twitch service', error);
    } finally {
      state.starting = null;
    }
  })();

  return state.client;
}

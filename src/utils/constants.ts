export const PERMISSIONS = <const>[
    'MANAGE_MESSAGES',
    'MANAGE_CHANNELS',
    'SEND_MESSAGES',
    'EMBED_LINKS',
    'ADD_REACTIONS',
    'READ_MESSAGE_HISTORY',
    'USE_EXTERNAL_EMOJIS',
];

export const ICON = 'https://i.imgur.com/cGT4RMd.png';

export enum MODES {
    Classic = 'classic',
    Unlimited = 'unlimited'
};

export const RULES = `1. Each turn all players will have 30 seconds to declare a range from 0 to 100.
2. **The declare message has to follow the format '[start, end]' and contains nothing else**.
3. The bot then rolls a random number between 0 and 100.
4. If the number rolled ends up inside the declared range of a player, that player receives \`100-(end-start)\` points.
5. The first player to get to 100 points or the player with the highest amount of points after 5 rounds wins.`;

export const PLAYER = '';

export const PARTICIPANTS = '';

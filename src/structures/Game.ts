import type { Client } from './index';
import {
    Message,
    User,
    TextChannel,
    Collection,
    MessageReaction,
    ReactionCollector,
    MessageCollector,
} from 'discord.js';
import { MODES, RULES } from '@utils/constants';
const { PREFIX } = process.env;

class Timer {
    public id: NodeJS.Timeout;
    public check: NodeJS.Timeout;
    public callback: (...args: any[]) => void;
    public delay: number;
    public start: number;
    public remaining: number;
    public collector: MessageCollector | ReactionCollector | null;

    pause() {
        if (this.id) {
            clearTimeout(this.id);
            this.id = null;
            this.remaining = this.delay - (Date.now() - this.start);
            if (this.collector) {
                if (this.check) clearInterval(this.check);
                this.check = setInterval(() => {
                    this.collector.resetTimer({ time: this.remaining });
                }, this.remaining / 2);
            }
        }
    }

    resume() {
        if (!this.id) {
            this.start = Date.now();
            this.id = setTimeout(this.callback, this.remaining);
        }
        if (this.check) {
            clearInterval(this.check);
            this.check = null;
        }
    }

    reset(
        callback: (...args: any[]) => void,
        delay: number,
        collector?: MessageCollector | ReactionCollector
    ) {
        if (this.id) {
            clearTimeout(this.id);
            this.id = null;
        }
        this.callback = callback;
        this.delay = delay;
        this.remaining = delay;
        this.collector = collector;
        this.resume();
    }
}

export interface GameOptions {
    mode?: MODES;
    range?: number;
    winCondition?: number;
    time?: number;
    rounds?: number;
}
export class Game {
    public client: Client;
    public mode: MODES;
    public range: number;
    public winCondition: number;
    public time: number;
    public rounds: number;
    public channel: TextChannel;
    public ended: boolean;
    private round: number;
    private users: User[];
    private timer: Timer;
    private started: boolean;
    private pausing: boolean;
    private bets: Collection<User, Array<number>>;
    private leaderboard: Collection<User, number>;
    private regex = /^\[([0-9]{1,3}|r), ([0-9]{1,3}|r)\]$/;
    constructor(client: Client, channel: TextChannel, options: GameOptions) {
        this.client = client;
        this.mode = options.mode ?? MODES.Classic;
        this.range = options.range ?? 100;
        this.winCondition = options.winCondition ?? 100;
        this.rounds = options.rounds ?? 5;
        this.time = options.time ?? 30000;
        this.channel = channel;
        this.round = 0;
        this.timer = new Timer();
        this.started = false;
        this.pausing = false;
        this.ended = false;
        this.leaderboard = new Collection();
        this.users = [];
    }

    random(start: number, end: number) {
        return Math.floor(Math.random() * (end - start + 1) + start);
    }

    async collectParticipants(starter: User) {
        const message = await this.channel.send(
            this.client.embeds.default().setDescription(
                `${starter} started a ${Object.keys(MODES)
                    [Object.values(MODES).indexOf(this.mode)].match(/[A-Z][a-z]+/g)
                    .join(
                        ' '
                    )} 100-game! You have 30 seconds to react ✅ to this message to participate. Check out ${PREFIX}rules or hover over [here](https://bit.ly/3tE6MgR "${RULES}") if you don't know the rules yet.`
            )
        );
        message.react('✅');
        const collector = message.createReactionCollector(
            reaction => reaction.emoji.name === '✅',
            {
                time: 30000,
            }
        );
        let collected = null;
        collector.once('end', reactions => {
            collected = reactions;
        });
        this.timer.reset(
            () => {
                this.setUpLeaderboard(collected);
            },
            30000,
            collector
        );
    }

    setUpLeaderboard(collected: Collection<string, MessageReaction>) {
        if (!collected) {
            return this.channel.send('An unexpected error has occured.');
        }
        this.users = collected.first().users.cache.array();
        if (this.users.length <= 1) {
            return this.channel.send(
                this.client.embeds
                    .default()
                    .setDescription(
                        "Looks like there's not enough player. The game will not start."
                    )
            );
        }
        if (this.users.length > 10) {
            this.users = this.users.slice(0, 10);
        }
        if (this.users.length > 2) {
            this.users = this.users.filter(u => u.id !== this.client.user.id);
        }
        this.channel.send(
            this.client.embeds
                .default()
                .setTitle("Time's up!")
                .setDescription(
                    `${this.users.join(
                        ', '
                    )} will be the participants for this game!\nIf you're not here, it means you've joined too late and/or the game already has 10 players.`
                )
        );
        this.channel.send(
            this.client.embeds
                .default()
                .setTitle(`First player(s) to get to ${this.winCondition} wins.`)
        );
        this.users.forEach(u => this.leaderboard.set(u, 0));
        this.timer.reset(() => {
            this.play();
        }, 1000);
    }

    async start(message: Message) {
        this.winCondition =
            this.mode === MODES.UltimateRandom
                ? this.random(1, this.winCondition)
                : this.winCondition;
        this.rounds =
            this.mode === MODES.UltimateRandom ? this.random(1, this.rounds) : this.rounds;
        await this.collectParticipants(message.author);
    }

    abort() {
        this.timer.pause();
        this.ended = true;
        this.channel.send(this.client.embeds.default().setTitle('The game has been aborted.'));
        if (this.started && this.mode === MODES.Unlimited) this.announceLeaderboard();
    }

    pause() {
        if (this.pausing) {
            return this.channel.send(this.client.embeds.clientError('The game is already paused.'));
        }
        this.timer.pause();
        this.pausing = true;
        this.channel.send(this.client.embeds.default().setTitle('Paused.'));
    }

    continue() {
        if (!this.pausing) {
            return this.channel.send(
                this.client.embeds.clientError("The game hasn't been paused yet.")
            );
        }
        this.timer.resume();
        this.pausing = false;
        this.channel.send(this.client.embeds.default().setTitle('Continuing.'));
    }

    async collectBets() {
        this.channel.send(
            this.client.embeds
                .default()
                .setTitle(
                    `Round #${this.round + 1} of ${
                        this.mode === MODES.Unlimited ? '?' : this.rounds
                    }`
                )
                .setDescription(
                    `You have ${
                        this.time / 1000
                    } seconds to place your bet. Your bet must be inside the range [0, ${
                        this.range
                    }].\n**Please remember that the declare message has to follow the format '[start, end]' and contains nothing else.**\nIf you want to randomize your bet, use the letter \`r\` (E.g: \`[r, 69]\`).\nUpon successfully receiving your bet, I will react to your message with a ✅.\nYou can change your bet anytime before the timer ends. Your last bet will be your final choice.`
                )
        );
        this.bets = new Collection<User, Array<number>>();
        const collector = this.channel.createMessageCollector(
            async m => {
                let match = m.content.match(this.regex);
                if (!match) return false;
                let start = +match[1],
                    end = +match[2];
                if (isNaN(start)) {
                    if (isNaN(end)) {
                        const f = this.random(0, this.range);
                        const s = this.random(0, this.range);
                        (start = Math.min(f, s)), (end = Math.max(f, s));
                    }
                    start = this.random(0, end);
                } else if (isNaN(end)) {
                    end = this.random(start, this.range);
                }
                if (start < 0 || end > 100 || start > end) return false;
                await m.react('✅');
                this.bets.set(m.author, [start, end]);
                return true;
            },
            { time: this.time }
        );
        let collected = null;
        collector.once('end', collection => {
            collected = collection;
        });
        this.timer.reset(
            async () => {
                await this.announceBets(collected);
            },
            this.time,
            collector
        );
    }

    async announceBets(collected: Collection<string, Message>) {
        if (!collected) {
            return this.channel.send('An unexpected error has occured.');
        }
        if (this.users.some(u => u.id === this.client.user.id)) {
            const f = this.random(0, this.range);
            const s = this.random(0, this.range);
            const start = Math.min(f, s),
                end = Math.max(f, s);
            this.bets.set(this.client.user, [start, end]);
        }
        // const betsDisplay = this.bets.map((b, u) => `${u}: [${b.join(', ')}]`);
        const userList = this.bets.keyArray();
        const betsDisplay = this.client.util.presentTable([
            ['#', 'PLAYERS', 'BETS'],
            ...this.bets.array().map((b, i) => [`${i + 1}`, userList[i].tag, `[${b.join(', ')}]`]),
        ]);
        this.channel.send(
            this.client.embeds
                .default()
                .setTitle(`Time's up! Here are the bets:`)
                .setDescription(`\`\`\`${betsDisplay}\`\`\``)
        );
        this.timer.reset(async () => {
            await this.pauseChamp();
        }, 1000);
    }

    async pauseChamp() {
        const msg = await this.channel.send(
            this.client.embeds.default().setTitle(`And the secret number is: ... PauseChamp`)
        );
        this.timer.reset(async () => {
            await this.announceSecretNumber(msg);
        }, 5000);
    }

    async announceSecretNumber(message: Message) {
        const number = this.random(0, this.range);
        if (message.deletable) await message.delete();
        await message.channel.send(
            this.client.embeds.default().setTitle(`And the secret number is: ${number}!`)
        );
        this.bets.forEach((b, u) => {
            const [start, end] = b;
            if (start <= number && number <= end) {
                const cur = this.leaderboard.get(u);
                const diff = this.range - (end - start);
                this.leaderboard.set(
                    u,
                    cur + (this.mode === MODES.UltimateRandom ? this.random(0, diff) : diff)
                );
            }
        });
        this.timer.reset(() => {
            this.announceLeaderboard();
        }, 1000);
    }

    async announceLeaderboard() {
        this.leaderboard.sort((a, b) => b - a);
        const userList = this.leaderboard.keyArray();
        /* const leaderboard = this.leaderboard
            .array()
            .map((s, i) => `#${i + 1}. **${userList[i]}**: ${s} points. ${s >= 100 ? '👑' : ''}`)
            .join('\n'); */
        const firstPlaces = this.leaderboard
            .filter(s => s === this.leaderboard.first())
            .array().length;
        const leaderboard = this.client.util.presentTable([
            ['#', 'PLAYERS', 'POINTS'],
            ...this.leaderboard
                .array()
                .map((s, i) => [
                    `${i + 1} ${
                        s >= this.winCondition && i < firstPlaces && this.mode !== MODES.Unlimited
                            ? '(👑)'
                            : ''
                    }`,
                    userList[i].tag,
                    `${s}`,
                ]),
        ]);
        // await this.channel.send('=================================');
        await this.channel.send(
            this.client.embeds
                .default()
                .setTitle(`Here's the leaderboard:`)
                .setDescription(`\`\`\`${leaderboard}\`\`\``)
        );
        const winner = this.leaderboard.first() >= this.winCondition;
        if (winner && this.mode !== MODES.Unlimited) {
            this.ended = true;
            const firstPlase = this.leaderboard.first();
            const winners = this.leaderboard.filter(s => s === firstPlase).array();
            let congrats = `The winner`;
            if (winners.length > 1)
                congrats += `s are: ${winners.join(', ')} with ${firstPlase} points!`;
            else congrats += ` is: ${this.leaderboard.firstKey()} with ${firstPlase} points!`;
            return this.channel.send(
                this.client.embeds.default().setTitle('Congratulations!').setDescription(congrats)
            );
        }
        if (this.ended) return;
        // await this.channel.send('=================================');
        this.timer.reset(() => {
            this.round++;
            this.play();
        }, 1000);
    }

    play() {
        this.started = true;
        if (this.round >= this.rounds && this.mode !== MODES.Unlimited) {
            this.ended = true;
            const firstPlase = this.leaderboard.first();
            if (firstPlase === 0) {
                return this.channel.send(
                    this.client.embeds.default().setTitle('Unfortunately, no one won. Sadge')
                );
            }
            const winners = this.leaderboard.filter(s => s === firstPlase).array();
            let congrats = `The winner`;
            if (winners.length > 1)
                congrats += `s are: ${winners.join(', ')} with ${firstPlase} points!`;
            else congrats += ` is: ${this.leaderboard.firstKey()} with ${firstPlase} points!`;
            return this.channel.send(
                this.client.embeds.default().setTitle('Congratulations!').setDescription(congrats)
            );
        }
        this.timer.reset(() => {
            if (this.mode === MODES.UltimateRandom) {
                this.time = this.random(10, this.time / 1000) * 1000;
                this.range = this.random(0, this.range);
            }
            this.collectBets();
        }, 1000);
    }
}

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

export class Game {
    public client: Client;
    public time: number;
    public rounds: number;
    public channel: TextChannel;
    private round: number;
    private users: User[];
    private timer: Timer;
    private pausing: boolean;
    private leaderboard: Collection<User, number>;
    private regex = /^\[([0-9]{1,3}), ([0-9]{1,3})\]$/;
    constructor(client: Client, channel: TextChannel, rounds = 5, time = 30000) {
        this.client = client;
        this.rounds = rounds;
        this.channel = channel;
        this.round = 0;
        this.time = time;
        this.timer = new Timer();
        this.pausing = false;
        this.leaderboard = new Collection();
        this.users = [];
    }

    async collectParticipants(starter: User) {
        let msg = `${starter} started a 100-game! You have 30 seconds to react ✅ to this message to participate. Check out ${PREFIX}rules if you don't know the rules yet.`;
        const message = await this.channel.send(msg);
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
                "Looks like there's not enough player. The game will not start."
            );
        }
        if (this.users.length > 2) {
            this.users = this.users.filter(u => u.id !== this.client.user.id);
        }
        this.channel.send(
            `Time's up! ${this.users.join(', ')} will be the participants for this game!`
        );
        this.users.forEach(u => this.leaderboard.set(u, 0));
        this.timer.reset(() => {
            this.play();
        }, 1000);
    }

    async start(message: Message) {
        await this.collectParticipants(message.author);
    }

    abort(showScore = false) {
        this.timer.pause();
        this.channel.send('The game has been aborted.');
    }

    pause() {
        this.pausing = true;
        this.timer.pause();
        this.channel.send('Paused.');
    }

    continue() {
        this.pausing = false;
        this.timer.resume();
    }

    async collectBets() {
        this.channel.send(
            `Round **#${this.round + 1}** of **${this.rounds}!**\nYou will have ${
                this.time / 1000
            } seconds to place your bet.\n**Please remember that the declare message has to follow the format \'[start, end]\' and contains nothing else.**\nUpon successfully receiving your bet, I will react to your message with a ✅.\nYou can change your bet anytime before the timer ends. Your last bet will be your final choice.`
        );
        const collector = this.channel.createMessageCollector(
            async m => {
                const match = m.content.match(this.regex);
                if (!match) return false;
                const start = +match[1],
                    end = +match[2];
                if (start < 0 || end > 100 || start > end) return false;
                await m.react('✅');
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
            30000,
            collector
        );
    }

    async announceBets(collected: Collection<string, Message>) {
        if (!collected) {
            return this.channel.send('An unexpected error has occured.');
        }
        let bets = new Collection<User, string>();
        collected.forEach(m => bets.set(m.author, m.content));
        if (this.users.some(u => u.id === this.client.user.id)) {
            const f = Math.floor(Math.random() * 100);
            const s = Math.floor(Math.random() * 100);
            const start = Math.min(f, s),
                end = Math.max(f, s);
            bets.set(this.client.user, `[${start}, ${end}]`);
        }
        const betsDisplay = bets.map((b, u) => `- **${u.tag}**: ${b}`);
        this.channel.send(`Time's up! Here are the bets:\n${betsDisplay.join('\n')}`);
        this.timer.reset(async () => {
            await this.pauseChamp(bets);
        }, 1000);
    }

    async pauseChamp(bets: Collection<User, string>) {
        const msg = await this.channel.send(`And the secret number is: ... PauseChamp`);
        this.timer.reset(async () => {
            await this.announceSecretNumber(msg, bets);
        }, 5000);
    }

    async announceSecretNumber(message: Message, bets: Collection<User, string>) {
        const number = Math.floor(Math.random() * 100);
        message.edit(`And the secret number is: ${number}!`);
        this.timer.reset(() => {
            this.calculateLeaderboard(bets, number);
        }, 1000);
    }

    calculateLeaderboard(bets: Collection<User, string>, number: number) {
        bets.forEach((b, u) => {
            const match = b.match(this.regex);
            const start = +match[1],
                end = +match[2];
            if (start <= number && number <= end) {
                const cur = this.leaderboard.get(u);
                this.leaderboard.set(u, cur + 100 - (end - start + 1));
            }
        });
        this.leaderboard.sort((a, b) => b - a);
        const userList = this.leaderboard.keyArray();
        const leaderboard = this.leaderboard
            .array()
            .map((s, i) => `#${i + 1}. **${userList[i]}**: ${s} points. ${s >= 100 ? '👑' : ''}`);
        this.timer.reset(async () => {
            await this.announceLeaderboard(leaderboard);
        }, 1000);
    }

    async announceLeaderboard(leaderboard: string[]) {
        await this.channel.send('=================================');
        await this.channel.send(
            `Here's the leaderboard after this round:\n${leaderboard.join('\n')}`
        );
        const winner = this.leaderboard.first() >= 100;
        if (winner) {
            await this.channel.send(
                `Congratulations! The winner is: ${this.leaderboard.firstKey()} with ${this.leaderboard.first()} points!`
            );
            return;
        }
        await this.channel.send('=================================');
        this.timer.reset(() => {
            this.round++;
            this.play();
        }, 1000);
    }

    play() {
        if (this.round >= 5) {
            return this.channel.send(
                `Congratulations! The winner is: ${this.leaderboard.firstKey()} with ${this.leaderboard.first()} points!`
            );
        }
        this.timer.reset(() => {
            this.collectBets();
        }, 1000);
    }
}

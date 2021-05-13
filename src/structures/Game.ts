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

export class Game {
    public client: Client;
    public mode: MODES;
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
    constructor(client: Client, channel: TextChannel, mode = MODES.Classic, rounds = 5, time = 30000) {
        this.client = client;
        this.mode = mode;
        this.rounds = rounds;
        this.channel = channel;
        this.time = time;
        this.round = 0;
        this.timer = new Timer();
        this.started = false;
        this.pausing = false;
        this.ended = false;
        this.leaderboard = new Collection();
        this.users = [];
    }

    async collectParticipants(starter: User) {
        const message = await this.channel.send(
            this.client.embeds
                .default()
                .setDescription(
                    `${starter} started a${
                        this.mode === MODES.Unlimited ? 'n unlimited' : ''
                    } 100-game! You have 30 seconds to react ✅ to this message to participate. Check out ${PREFIX}rules or hover over [here](https://bit.ly/3tE6MgR "${RULES}") if you don't know the rules yet.`
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
        this.users.forEach(u => this.leaderboard.set(u, 0));
        this.timer.reset(() => {
            this.play();
        }, 1000);
    }

    async start(message: Message) {
        await this.collectParticipants(message.author);
    }

    abort() {
        this.timer.pause();
        this.ended = true;
        this.channel.send(
            this.client.embeds.default().setTitle('The game has been aborted.')
        );
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
                .setTitle(`Round #${this.round + 1} of ${this.mode === MODES.Unlimited ? '?' : this.rounds}`)
                .setDescription(
                    `You have ${
                        this.time / 1000
                    } seconds to place your bet.\n**Please remember that the declare message has to follow the format '[start, end]' and contains nothing else.**\nIf you want to randomize your bet, use the letter \`r\` (E.g: \`[r, 69]\`).\nUpon successfully receiving your bet, I will react to your message with a ✅.\nYou can change your bet anytime before the timer ends. Your last bet will be your final choice.`
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
                        const f = Math.floor(Math.random() * 101);
                        const s = Math.floor(Math.random() * 101);
                        (start = Math.min(f, s)), (end = Math.max(f, s));
                    }
                    start = Math.floor(Math.random() * end);
                } else if (isNaN(end)) {
                    end = Math.floor(Math.random() * (101 - start) + start);
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
            30000,
            collector
        );
    }

    async announceBets(collected: Collection<string, Message>) {
        if (!collected) {
            return this.channel.send('An unexpected error has occured.');
        }
        if (this.users.some(u => u.id === this.client.user.id)) {
            const f = Math.floor(Math.random() * 101);
            const s = Math.floor(Math.random() * 101);
            const start = Math.min(f, s),
                end = Math.max(f, s);
            this.bets.set(this.client.user, [start, end]);
        }
        // const betsDisplay = this.bets.map((b, u) => `${u}: [${b.join(', ')}]`);
        const betsDisplay = this.client.util.presentTable([
            ['PLAYERS', 'BETS'],
            ...this.bets.map((b, u) => [u.tag, `[${b.join(', ')}]`]),
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
        const number = Math.floor(Math.random() * 101);
        if (message.deletable) await message.delete();
        await message.channel.send(
            this.client.embeds.default().setTitle(`And the secret number is: ${number}!`)
        );
        this.bets.forEach((b, u) => {
            const [start, end] = b;
            if (start <= number && number <= end) {
                const cur = this.leaderboard.get(u);
                this.leaderboard.set(u, cur + 100 - (end - start));
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
                    `${s >= 100 && i < firstPlaces && this.mode !== MODES.Unlimited ? '👑' : `${i + 1}`}`,
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
        const winner = this.leaderboard.first() >= 100;
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
            this.collectBets();
        }, 1000);
    }
}

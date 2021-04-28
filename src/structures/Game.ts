import type { Client } from './index';
import { Message, User, TextChannel, Collection } from 'discord.js';
import { PARTICIPANTS, PLAYER } from '@utils/constants';
const { PREFIX } = process.env;

export class Game {
    public client: Client;
    public time: number;
    public rounds: number;
    public channel: TextChannel;
    private users: User[];
    private leaderboard: Collection<User, number>;
    constructor(client: Client, channel: TextChannel, rounds = 5, time = 30000) {
        this.client = client;
        this.rounds = rounds;
        this.channel = channel;
        this.time = time;
        this.leaderboard = new Collection();
        this.users = [];
    }

    async editPerms(roleID: string) {
        const role = await this.channel.guild.roles.fetch(roleID);
        if (role) {
            this.users.forEach(async u => await this.channel.guild.member(u).roles.add(role));
            await this.channel.overwritePermissions([
                {
                    id: this.channel.guild.roles.everyone.id,
                    deny: ['SEND_MESSAGES'],
                },
                {
                    id: role,
                    allow: ['SEND_MESSAGES'],
                },
            ]);
            return true;
        }
        return false;
    }

    async revertPerms() {
        await this.channel.overwritePermissions([
            {
                id: this.channel.guild.roles.everyone.id,
                allow: ['SEND_MESSAGES'],
            },
        ]);
    }

    async getReady(starter: User) {
        let timeLeft = 30000;
        let msg = `${starter} started a 100-game! You have ${
            timeLeft / 1000
        } seconds to react ✅ to this message to participate. Check out ${PREFIX}rules if you don't know the rules yet.`;
        if (PLAYER && (await this.channel.guild.roles.fetch(PLAYER))) msg = `<@&${PLAYER}>, ` + msg;
        const message = await this.channel.send(msg);
        message.react('✅');
        const collected = await message.awaitReactions(reaction => reaction.emoji.name === '✅', {
            time: 30000,
        });
        this.users = collected.first().users.cache.array();
        if (this.users.length < 1) {
            this.channel.send("Looks like there's not enough player. The game will not start.");
            return false;
        }
        if (this.users.length > 2) this.users = this.users.filter(u => u.id !== message.author.id);
        this.channel.send(
            `Time's up! ${this.users.join(', ')} will be the participants for this game!`
        );
        this.users.forEach(u => this.leaderboard.set(u, 0));
        if (PARTICIPANTS) return await this.editPerms(PARTICIPANTS);
        return true;
    }

    async start(message: Message) {
        const ok = await this.getReady(message.author);
        if (!ok) return;
        this.play();
        return this.revertPerms();
    }

    abort() {}

    async play() {
        for (let i = 0; i < this.rounds; i++) {
            this.channel.send(
                `Round **#${i + 1}** of **${this.rounds}!**\nYou will have ${
                    this.time / 1000
                } seconds to place your bet.\n**Please remember that the declare message has to follow the format \'[start, end]\' and contains nothing else.**\nUpon successfully receiving your bet, I will react to your message with a ✅.\nYou can change your bet anytime before the timer ends. Your last bet will be your final choice.`
            );
            const regex = /^\[([0-9]{1,3}), ([0-9]{1,3})\]$/;
            const collected = await this.channel.awaitMessages(
                async m => {
                    const match = m.content.match(regex);
                    if (!match) return false;
                    const start = +match[1],
                        end = +match[2];
                    if (start < 0 || end > 100 || start > end) return false;
                    await m.react('✅');
                    return true;
                },
                { time: this.time }
            );
            let bets = new Collection<User, string>();
            collected.forEach(m => bets.set(m.author, m.content));
            const betsDisplay = bets.map((b, u) => `- **${u.tag}**: ${b}`);
            this.channel.send(`Time's up! Here are the bets:\n${betsDisplay.join('\n')}`);
            const number = Math.floor(Math.random() * 100);
            await this.channel.send(`And the secret number is: ... PauseChamp`).then(
                m =>
                    new Promise(resolve => {
                        setTimeout(() => {
                            resolve(m.edit(`And the secret number is: ${number}!`));
                        }, 5000);
                    })
            );
            bets.forEach((b, u) => {
                const match = b.match(regex);
                const start = +match[1],
                    end = +match[2];
                if (start <= number && number <= end) {
                    const cur = this.leaderboard.get(u);
                    this.leaderboard.set(u, cur + 100 - (end - start + 1));
                }
            });
            this.leaderboard.sort((a, b) => b - a);
            const userList = this.leaderboard.keyArray();
            const tmpLB = this.leaderboard
                .array()
                .map(
                    (s, i) => `#${i + 1}. **${userList[i]}**: ${s} points. ${s >= 100 ? '👑' : ''}`
                );
            this.channel.send('=================================');
            this.channel.send(`Here's the leaderboard after this round:\n${tmpLB.join('\n')}`);
            const winner = this.leaderboard.first() >= 100;
            if (winner) {
                return this.channel.send(
                    `Congratulations! The winner is: ${this.leaderboard.firstKey()} with ${this.leaderboard.first()} points!`
                );
            }
            this.channel.send('=================================');
        }
        return this.channel.send(
            `Congratulations! The winner is: ${this.leaderboard.firstKey()} with ${this.leaderboard.first()} points!`
        );
    }
}

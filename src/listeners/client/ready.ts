import { Listener } from '@structures';

export default class extends Listener {
    constructor() {
        super('ready', {
            emitter: 'client',
            event: 'ready',
            category: 'client',
        });
    }

    exec() {
        this.client.logger.info(
            `[READY] Logged in as ${this.client.user!.tag}! ID: ${this.client.user!.id}`
        );
        this.client.user!.setActivity('your commands', { type: 'LISTENING' });
    }
}

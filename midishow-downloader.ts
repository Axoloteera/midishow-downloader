import axios, { AxiosInstance, AxiosProxyConfig, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { JSDOM } from 'jsdom';
import { CookieJar } from 'tough-cookie';

class MidiShowDownloader {
    private requester: AxiosInstance;
    private cookie: CookieJar;

    constructor() {
        this.cookie = new CookieJar();
        this.requester = wrapper(axios.create({
            headers: {
                "accept": "*/*",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Connection": "keep-alive"
            },
            withCredentials: true,
            jar: this.cookie
        }));
    }

    private etag_decode(origin: string): string {
        let t = "";
        for (let e = 0; e < origin.length && "00" !== origin.substring(e, e + 2); e += 2) {
            t += String.fromCharCode(parseInt(origin.substring(e, e + 2), 16));
        }
        return t;
    }

    private de(t: string, e: string): string {
        let n, i, s, r, o, a, h = "", u = 0;
        while (u < t.length) {
            n = e.indexOf(t.charAt(u++)) << 2 | (r = e.indexOf(t.charAt(u++))) >> 4;
            i = (15 & r) << 4 | (o = e.indexOf(t.charAt(u++))) >> 2;
            s = (3 & o) << 6 | (a = e.indexOf(t.charAt(u++)));
            h += String.fromCharCode(n);
            if (64 != o) h += String.fromCharCode(i);
            if (64 != a) h += String.fromCharCode(s);
        }
        return h;
    }

    private getCsrf(html: string): string {
        const csrf = new JSDOM(html)
            .window
            .document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');
        if (!csrf) throw new Error('CSRF token not found');
        return csrf;
    }

    private getMidiLink(html: string, id: number): string {
        const link = new JSDOM(html)
            .window
            .document
            .querySelector(`div[data-id="${id}"]`)
            ?.getAttribute('data-mid');
        if (!link) throw new Error('MIDI link not found');
        return link;
    }

    public async login(identity: string, password: string, proxy: AxiosProxyConfig | false = false): Promise<void> {
        const response: AxiosResponse = await this.requester.get('https://www.midishow.com/en/user/account/login', {
            headers: {
                'Referer': 'https://www.midishow.com/en/user/account/login',
                'Origin': 'https://www.midishow.com',
                'Host': 'www.midishow.com'
            },
            proxy
        });

        const csrf = this.getCsrf(response.data);

        let cookie_csrf = '';
        const cookies = response.headers['set-cookie'];
        if (cookies) {
            for (const cookie of cookies) {
                if (cookie.includes('_csrf')) {
                    cookie_csrf = cookie.split(';')[0];
                }
            }
        } else {
            throw new Error('No cookies available');
        }

        await this.requester.post('https://www.midishow.com/en/user/account/login', {
            '_csrf': csrf,
            'LoginForm[identity]': identity,
            'LoginForm[password]': password,
            'login-button': ''
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://www.midishow.com/en/user/account/login',
                'Origin': 'https://www.midishow.com',
                'Host': 'www.midishow.com',
                'Cookie': cookie_csrf
            },
            proxy
        });
    }

    public async getMidiFile(id: number, proxy: AxiosProxyConfig | false = false): Promise<string> {
        const pageResponse: AxiosResponse = await this.requester.get(`https://www.midishow.com/en/midi/${id}.html`, {
            proxy
        });

        const csrf = this.getCsrf(pageResponse.data);

        const response1: AxiosResponse = await this.requester.post(`https://www.midishow.com/midi/new-file?id=${id}`, {
            'id': id
        }, {
            headers: {
                'X-CSRF-TOKEN': csrf,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                "X-Requested-With": "XMLHttpRequest"
            },
            proxy
        });

        const response2: AxiosResponse = await this.requester.get(
            this.getMidiLink(pageResponse.data, id)
                .replace(/^tokeno#:@!/, "token")
                .replace("https://www.midishow.com", "https://s.midishow.net")
                .replace(".mid?", ".js?"), {
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    "X-Requested-With": "XMLHttpRequest"
                },
                proxy
            });

        const de_e = this.etag_decode(response1.headers['etag']) + response1.data.substr(56);
        const file = this.de(response1.data.substr(28, 28), de_e)
            + this.de(response2.data.substr(3, response2.data.length - 5), de_e)
            + this.de(response1.data.substr(0, 28), de_e);
        return file;
    }
}

export { MidiShowDownloader };
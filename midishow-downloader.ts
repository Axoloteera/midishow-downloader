import axios, { AxiosInstance, AxiosProxyConfig , AxiosResponse} from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { JSDOM } from 'jsdom';
import { CookieJar } from 'tough-cookie';

const cookies: CookieJar[] = [];
let currentSessionIndex: number = 0;
let isLoggedIn: boolean = false;

const requester: AxiosInstance = wrapper(axios.create({
    headers: {
        "accept": "*/*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Connection": "keep-alive"
    },
    withCredentials: true,
    jar: new CookieJar()
}))

const getNextCookie = function(): CookieJar {
    if (!isLoggedIn) throw new Error('Not logged in');
    if (cookies.length === 0) throw new Error('No cookies available');
    const cookie = cookies[currentSessionIndex];
    currentSessionIndex = (currentSessionIndex + 1) % cookies.length;
    return cookie;
}

const etag_decode = function(origin: string): string {
    for (var t = "", e = 0; e < origin.length && "00" !== origin.substring(e, e + 2); e += 2)
        t += String.fromCharCode(parseInt(origin.substring(e, e + 2), 16));
    return t
}

const de = function(t: string, e: string) {
    for (var n, i, s, r, o, a, h = "", u = 0; u < t.length; )
        n = e.indexOf(t.charAt(u++)) << 2 | (r = e.indexOf(t.charAt(u++))) >> 4,
        i = (15 & r) << 4 | (o = e.indexOf(t.charAt(u++))) >> 2,
        s = (3 & o) << 6 | (a = e.indexOf(t.charAt(u++))),
        h += String.fromCharCode(n),
        64 != o && (h += String.fromCharCode(i)),
        64 != a && (h += String.fromCharCode(s));
    return h
}

const getCsrf = function(html: string): string {
    const csrf: string | null | undefined = new JSDOM(html)
        .window
        .document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');
    if (!csrf) throw new Error('CSRF token not found');
    return csrf;
}

const getMidiLink = function(html: string, id: number): string {
    const link: string | null | undefined = new JSDOM(html)
        .window
        .document
        .querySelector(`div[data-id="${id}"]`)
        ?.getAttribute('data-mid');
    if (!link) throw new Error('MIDI link not found');
    return link;
}

const login = async function(identity: string, password: string, proxy: AxiosProxyConfig | false = false): Promise<any> {

    const cookie: CookieJar = new CookieJar();

    const response: AxiosResponse = await requester.get('https://www.midishow.com/en/user/account/login', {
        headers: {
            'Referer': 'https://www.midishow.com/en/user/account/login',
            'Origin': 'https://www.midishow.com',
            'Host': 'www.midishow.com'
        },
        proxy
    });

    const csrf: string | null | undefined = getCsrf(response.data);

    let cookie_csrf = '';
    const cookies = response.headers['set-cookie'];
    if (cookies) {
        for (const cookie of cookies) {
            if(cookie.includes('_csrf')){
                cookie_csrf = cookie.split(';')[0];
            }
        }
    } else {
        throw new Error('No cookies available');
    }

    const response2: AxiosResponse = await requester.post('https://www.midishow.com/en/user/account/login', {
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

    console.log(response2);
    //输出返回的cookie
    console.log(response2.headers['set-cookie']);
    return true;
}

const getMidiFile = async function(id: number, proxy: AxiosProxyConfig | false = false): Promise<string> {


    const pageResponse: AxiosResponse = await requester.get(`https://www.midishow.com/en/midi/${id}.html`, {
        proxy
    });

    const csrf: string | null | undefined = getCsrf(pageResponse.data);

    console.log(csrf);

    const response1: AxiosResponse = await requester.post(`https://www.midishow.com/midi/new-file?id=${id}`,
        {
            'id': id
        },
        {
            headers: {
                'X-CSRF-TOKEN': csrf,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                "X-Requested-With": "XMLHttpRequest"
            },
            proxy
        }
    );

    const response2: AxiosResponse = await requester.get(
        getMidiLink(pageResponse.data, id)
            .replace(/^tokeno#:@!/, "token")
            .replace("https://www.midishow.com", "https://s.midishow.net")
            .replace(".mid?", ".js?")
        , {
        headers: {
                'X-CSRF-TOKEN': csrf,
                "X-Requested-With": "XMLHttpRequest"
            },
            proxy
        }
    );

    const de_e: string = etag_decode(response1.headers['etag']) + response1.data.substr(56);
    const file: string = de(response1.data.substr(28, 28), de_e)
        + de(response2.data.substr(3, response2.data.length - 5), de_e)
        + de(response1.data.substr(0, 28), de_e);
    return file;
}

export { getMidiFile, login }
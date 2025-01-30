import axios from 'axios';
import { JSDOM } from 'jsdom';



const session = axios.create({
    proxy: {
        protocol: 'http',
        host: '127.0.0.1',
        port: 7897  // 根据你的代理端口修改
    },
    headers: {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://www.midishow.com/",
        "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Google Chrome\";v=\"132\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "script",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": ""
    }
});

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
    const csrf = new JSDOM(html)
        .window
        .document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');
    if (!csrf) throw new Error('CSRF token not found');
    console.log(csrf);
    return csrf;
}

const getMidiLink = function(html: string, id: number): string {
    const link = new JSDOM(html)
        .window
        .document
        .querySelector(`div[data-id="${id}"]`)
        ?.getAttribute('data-mid');
    if (!link) throw new Error('MIDI link not found');
    return link;
}

const login = async function(username: string, password: string) {
    const response = await session.get('https://www.midishow.com/login');
    const csrf = getCsrf(response.data);

}


const getMidiFile = async function(id: number): Promise<string> {

    const pageResponse = await session.get(`https://www.midishow.com/en/midi/${id}.html`);
    const csrf = getCsrf(pageResponse.data);

    const formData = new FormData();
    formData.append('id', id.toString());
    
    const response1 = await session.post(`https://www.midishow.com/midi/new-file?id=${id}`,
        {
            'id': id
        },
        {
            headers: {
                'X-CSRF-TOKEN': csrf,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
        }
    );

    const response2 = await session.get(
        getMidiLink(pageResponse.data, id)
            .replace(/^tokeno#:@!/, "token")
            .replace("https://www.midishow.com", "https://s.midishow.net")
            .replace(".mid?", ".js?")
        , {
        headers: {
            'X-CSRF-TOKEN': csrf
        }
    });

    const de_e = etag_decode(response1.headers['etag']) + response1.data.substr(56);
    const file = de(response1.data.substr(28, 28), de_e)
        + de(response2.data.substr(3, response2.data.length - 5), de_e)
        + de(response1.data.substr(0, 28), de_e);
    return file;
}

export { getMidiFile }

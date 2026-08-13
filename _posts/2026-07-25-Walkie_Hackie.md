---
title: Writeup of the Walkie Hackie challenge
description: Analyzing the signal between two walkie-talkies.
date: 2026-07-25 16:00:00 +0100
type: writeup
permalink: /writeups/:title/
categories: ['Hack The Box Challenges - Hardware', 'Very Easy']
tag: [Hardware, Signals, CTF]
image: /assets/img/writeups/Walkie_Hackie/WalkieHackie.png
---

## Intro

The challenge intro reveals that we have a signal capture and that we need to "interrupt" the communication between two walkie-talkies.

`Our agents got caught during a mission and found that the guards are using old walkie-talkies for their communication. The field team captured their transmissions. Can you interrupt their communication to help our agents escape from the guards?`

So let's start.

---

## Challenge

Extracting the files from the ZIP file results in four files named:
- 1.complex
- 2.complex
- 3.complex
- 4.complex

Now, I've never seen that file extension before and the `file` command results in the type being `data`...so google it is.
Google provides the following AI summary:
`A .complex file is primarily used as a raw radio frequency (RF) signal data file containing IQ (In-phase and Quadrature) data samples, often utilized in software like Universal Radio Hacker (URH)`.

I wonder how much water that response took... anyways, the summary says that the file type is often utilized by URH.

We can install the software with pipx: `pipx install urh`.

Opening the files inside URH displays the following signals:

![Signals](/assets/img/writeups/Walkie_Hackie/signals.png)
_Data shown as wave signals._

URH also has an `analysis` tab that tries to analyze the signal:

![Analyzed signals](/assets/img/writeups/Walkie_Hackie/analyzed_signals.png)
_Decoded binary signals to hexadecimal values._

URH also helpfully highlights what it calls the `preamble` and the `synchronization` packets. These appear to be the same across all four signals, with the difference between the signals being the last few bytes. The last few bytes of each signal in order being:
1. `a2ff84`
2. `a1ff14`
3. `b2ff24`
4. `b1ff57`

The last segment seems to always contain `0xff` in the middle of the signal. Other than that, no data can be retrieved, so we can take a look at the web page this challenge spawns.

The web page allows us to send "RF signals over HTTP":

![RF over HTTP](/assets/img/writeups/Walkie_Hackie/rf_over_http.png)
_Form to be filled out._

Filling out the form and clicking "Transmit" sends a POST request to the `/transmit` endpoint with the following body:

![Body of HTTP](/assets/img/writeups/Walkie_Hackie/body.png)
_POST body with parameters `pa`, `sw`, and `pl`._

Thanks to the analysis of the signals, we can conclude that the preamble parameter should be `aaaaaaaa` and the synchronization word should be `73214693`. We are left with figuring out what the payload parameter should be.

We can try to brute-force the payload by using the fact that the first part of the payload goes `a2` -> `a1` -> `b2` -> `b1`. So we can either try `a2` again or `c2`. The middle part should remain `ff`, while the last part could then be brute-forced.

We can write a short python script that will generate all possible payloads:

```python
for i in range(256):
  print(f'{i:02x}')
```

And running it like `python3 gen.py > payloads.txt` gives us a list of all possible payloads to test out:

```bash
❯ ffuf -u http://154.57.164.77:31245/transmit -X POST -d 'pa=aaaaaaaa&sw=73214693&pl=c2ffXX' -w payloads.txt:XX -H 'Content-Type: application/x-www-form-urlencoded' --fw 403                               ─╯

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : POST
 :: URL              : http://154.57.164.77:31245/transmit
 :: Wordlist         : XX: /home/kali/HTB/Challenges/Hardware/Very Easy/WalkieHackie/payloads.txt
 :: Header           : Content-Type: application/x-www-form-urlencoded
 :: Data             : pa=aaaaaaaa&sw=73214693&pl=c2ffXX
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response words: 403
________________________________________________

f9                      [Status: 200, Size: 2896, Words: 420, Lines: 134, Duration: 96ms]
:: Progress: [256/256] :: Job [1/1] :: 0 req/sec :: Duration: [0:00:00] :: Errors: 0 ::
```

By setting the first unknown to `c2` and brute-forcing the last part with `ffuf` we get a different response when the last part is `f9`.

By going to the web page and manually sending the preamble as `aaaaaaaa`, synchronization word as `73214693`, and the payload as `c2fff9` we get the following response:

![Flag](/assets/img/writeups/Walkie_Hackie/flag.png)
_Flag obtained._

The response contains the flag: `HTB{B4s1c_r4d10_fund4s}`, and with that the challenge is over.

## Extra Mile
---

In this extra mile I wanted to figure out an oddity in the waveform. UHR detects that the signal is modulated using FSK (Frequency Shift Keying) and it properly decodes it using FSK, yet the waveform indicates that the signal is using PSK (Phase Shift Keying). For a visual comparison:

![Comparison in wave forms](/assets/img/writeups/Walkie_Hackie/waveforms.png)
_Waveform comparison for different modulation methods. Source from: [https://medium.com/@divyanshu.chore/fsk-vs-psk-a-comparison-of-digital-modulation-techniques-74f94caf731d](https://medium.com/@divyanshu.chore/fsk-vs-psk-a-comparison-of-digital-modulation-techniques-74f94caf731d)._

And comparing it to the waveform we have:

![Waveform we have](/assets/img/writeups/Walkie_Hackie/signal_waveform.png)
_Waveforms of the challenge signal._

It's obvious that this signal should be modulated using PSK, yet the signal itself uses 2 frequencies as shown by the spectrogram view in UHR:

![Spectrogram](/assets/img/writeups/Walkie_Hackie/spectrogram.png)
_Spectrogram showing two distinct frequencies._

After a bit of googling, I found this post that had a similar issue: [https://ham.stackexchange.com/questions/7079/transmitted-fsk-sniffed-something-psk-looking](https://ham.stackexchange.com/questions/7079/transmitted-fsk-sniffed-something-psk-looking). 

It would seem that UHR centers the frequency to decode FSK signals, but this also means that the shift changes the "sign" of the signal. You can think of changing the "sign" of a signal to correspond to the change of its direction. So, as an example, if the signal was going up, the change of the sign would cause it to go down. This in turn reflects what we are seeing with the signal itself.

In addition, the changing of the "sign" of a signal corresponds to a phase shift of 180° explaining why the signal looks like it uses PSK.

If you have more insight into this subject matter feel free to leave a comment below.

{% include comment.html %}

---
title: "Need more info?"
subTitle: "let's keep in touch!"
slug: "contact"
heroImage: /img/hero/hero11.jpg
date: 2019-08-29T00:22:03+02:00
menu:
  main:
    parent: 'contact'
    weight: 400
---

{{% section invert %}}
## Contact

{{% row %}}
{{% column size="3" %}}

<form name="contact" method="POST" action="/contact/thanks" data-netlify="true">
  <p>
    <label>
      Your Name:
      <input type="text" name="name" required />
    </label>
  </p>
  <p>
    <label>
      Your Email:
      <input type="email" name="email" required />
    </label>
  </p>
  <p>
    <label>Enquiry:
      <select name="enquiry">
        <option value="material">I need material to play a work</option>
        <option value="manuscript">I need more information on Ferenc Farkas</option>
        <option value="website">I have a problem with the website</option>
        <option value="other">None of the above</option>
      </select>
    </label>
  </p>
  <p>
    <label>
      Message:
      <textarea name="message" rows="6"></textarea>
    </label>
  </p>
  <p>
    <button class="button" type="submit">Send</button>
  </p>
</form>

{{% /column %}}
{{% column  size="2" %}}
<br>

### Manuscripts, scores, private CD's and live recordings
**Andràs Farkas**
<br>
Chemin des Bouvreuils 12
<br>
1009 Pully, Switzerland
<br>
P 0041 21 728 47 27

{{% /column %}}
{{% /section %}}
---
title: "Need more info?"
subTitle: "let's keep in touch!"
refTitle: "Get in touch"
slug: "contact"
heroImage: /img/hero/hero11.jpg
date: 2021-03-21
menu:
  main:
    parent: 'contact'
    weight: 400
---

{{% section invert %}}

{{% row %}}
{{% column %}}
## Contact
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
        <option value="publisher">I have infos about a publisher</option>
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
{{% column %}}

## AF Publishing
<br>
Represents the private collection of András Farkas, the son of the composer.
It includes all the works of Ferenc Farkas that have not yet been edited.
These works can be sent to you by e-mail in PDF format.

It also contains privately-made compilation CD's of Ferenc Farkas' music,
mostly grouped by genre or category, as well as live recordings.
<br><br>
### Contact
**Andràs Farkas**
<br>
Chemin des Bouvreuils 12
<br>
1009 Pully, Switzerland
<br>
{{< icon "phone" >}} <a href="tel:+41217284728">+41 21 728 47 27</a>

{{% /column %}}
{{% /section %}}
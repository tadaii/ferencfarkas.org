# Shortcodes

Shortcodes are simple snippets that can be used inside markdwon content files allowing to extend content edition's features. They are specific to Hugo and are not standard Markdwon, thus they won't be interpreted in tools other than Hugo.

Please [read the shortcodes documentation on the Hugo website](https://gohugo.io/content-management/shortcodes/).

## Layout shortcodes

### Section {#id}

The `section` shortcode wraps your content in a block. Every page content file must have at least 1 `section`. Sections help separate different parts of a page making it more readable.

Base syntax:

```md
{{% section %}}
```

#### Modes
Section accepts a mode argument which changes the its background color. If no mode is provided, background color is white.

Available modes are:

##### Highlight

Sets the background color to the **primary color** defined in your corporate styles.

```md
{{% section highlight %}}
```

##### Focus

Sets the background color to the **secondary color**.

```md
{{% section focus %}}
```

##### Invert

Sets the background color to dark gray (defined in your corporate styles).

```md
{{% section invert %}}
```


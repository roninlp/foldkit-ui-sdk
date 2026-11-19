# foldkit-ui-sdk

Typed Foldkit bindings for [UI SDK](https://ui-sdk.dev)'s Web Components.

```bash
pnpm add foldkit-ui-sdk foldkit effect @effect/platform-browser
```

```ts
import { Toggle } from 'foldkit-ui-sdk/toggle'

const view = (model: Model, h: HtmlBuilder<Message>) => {
  const toggle = Toggle.Root.withMessage(h)

  return toggle(
    [
      toggle.Pressed(model.pressed),
      toggle.OnPressedchange(detail =>
        Message.ChangedPressed({ pressed: detail.value })
      ),
    ],
    [h.button([h.Type('button')], ['Bookmark'])]
  )
}
```

Each component subpath registers its own tags. `foldkit-ui-sdk` registers every tag and exports
one namespace per component, with parts named the way UI SDK names them: `Root`, `List`, `Tab`,
`Panel`, `Trigger`, `Content`, `Item`.

- [Component index](../../docs/components.md)
- [Architecture](../../docs/architecture.md)
- [Working repo and issues](https://github.com/roninlp/foldkit-ui-sdk)

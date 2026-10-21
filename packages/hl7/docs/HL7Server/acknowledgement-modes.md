# Acknowledgment modes

An HL7 sender asks for acknowledgments in the header of each message. HL7Server
follows the request.

## Original and enhanced mode

- Original mode: MSH-15 and MSH-16 are empty. The server sends one
  acknowledgment, the application acknowledgment: `AA` (accepted), `AE`
  (error) or `AR` (rejected), in `MSA-1`.
- Enhanced mode: MSH-15 (accept) and MSH-16 (application) ask for
  acknowledgments with `AL` (always), `NE` (never), `ER` (on error) or `SU`
  (on success). The accept acknowledgment uses the codes `CA`, `CE` and `CR`.

## When the accept acknowledgment is sent

The setting Accept acknowledgment (`acceptAcknowledgment`) decides when a `CA`
or `CE` goes out:

| Value       | The accept acknowledgment is sent                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `processed` | After the handlers finish: `CA` if they succeeded, `CE` if one threw an error or the response timeout passed. |
| `receipt`   | As soon as the message arrives, before the handlers run. A failing handler does not change it.                |

Use `processed` when `CA` must mean that your system has stored the message. The
default is `processed`.

## Devices that only know AA and AE

Some devices ask for enhanced mode but understand only `AA` and `AE`. Change the
code in a `beforeResponse` hook:

```ts
this.hl7.beforeResponse(res => {
  const code = res.get('MSA-1');
  if (code === 'CA') res.set('MSA-1', 'AA');
  if (code === 'CE') res.set('MSA-1', 'AE');
});
```

A hook can also return another message to send instead, or `null` to send
nothing.

## Messages that fail validation

With Validate messages on, a message that does not match its HL7 version is
answered with a negative acknowledgment that lists the errors, and the handlers
do not see it.

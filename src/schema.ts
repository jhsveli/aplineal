import { Type } from '@sinclair/typebox'

export const applauseIssueSchema = Type.Object({
  trigger: Type.String(),
  fields: Type.Array(
    Type.Object({
      name: Type.String(),
      value: Type.Optional(
          Type.Any()
      ),
      values: Type.Optional(
          Type.Array(Type.String())
      ),
      options: Type.Optional(Type.Array(
        Type.Object({
            value: Type.Number(),
            label: Type.String(),
        })
      )
      )
    })
  ),
  customFields: Type.Array(
    Type.Object({
      name: Type.String(),
      value: Type.String()
    })
  ),
  attachments: Type.Array(
      Type.Object({
        name: Type.String(),
        type: Type.String(),
        url: Type.String(),
      })
  ),
  environments: Type.Array(
      Type.Object({
        environment: Type.Object({
          "Language": Type.Optional(Type.String()),
          "Operating System": Type.Optional(Type.String()),
          "Operating System Version": Type.Optional(Type.String()),
          "Web Browser": Type.Optional(Type.String())
        })
      })
  )
})



      // enum: [
      //     "CREATED",
      //     "EDITED",
      //     "MANUAL_EXPORT",
      //     "STATUS_CHANGED",
      //     "MESSAGE_ADDED",
      //     "ATTACHMENT_ADDED",
      //     "ATTACHMENT_DELETED"
      // ]


//
//     environments: {
//       type: "array",
//       items: {
//         type: Type.Object(),
//         required: ["environment"],
//         properties: {
//           environment: {
//             type: Type.Object(),
//             properties: {
//               "Language": {type: [Type.String(), "null"]},
//               "Operating System": {type: [Type.String(), "null"]},
//               "Operating System Version": {type: [Type.String(), "null"]},
//               "Web Browser": {type: [Type.String(), "null"]},
//             },
//           },
//         },
//       }
//     },
//   },
// }
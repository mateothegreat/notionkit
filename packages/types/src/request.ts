import { type } from "arktype";

export const PostPayloadSchema = type({
  payload: type({
    type: '"page"',
    parent: type({
      type: '"database_id"',
      database_id: "string"
    }),
    properties: "object"
  })
});

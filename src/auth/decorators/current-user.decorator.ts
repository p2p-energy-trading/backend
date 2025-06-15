import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    // Check if it's a GraphQL context
    const ctx = GqlExecutionContext.create(context);
    if (ctx.getContext().req) {
      return ctx.getContext().req.user;
    }

    // Otherwise, it's a REST context
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);

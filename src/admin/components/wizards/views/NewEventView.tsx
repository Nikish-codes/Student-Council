import * as React from "react";
import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { AddEventWizard } from "../AddEventWizard.tsx";

/**
 * Server view: GET /admin/wizards/new-event
 *
 * Wraps the client-side wizard in Payload's DefaultTemplate so the admin
 * nav, header, and theme are preserved.
 */
export default function NewEventView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <div className="wc-wiz-wrap">
        <AddEventWizard />
      </div>
    </DefaultTemplate>
  );
}

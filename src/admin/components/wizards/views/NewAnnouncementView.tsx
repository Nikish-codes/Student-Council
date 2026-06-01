import * as React from "react";
import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { PostAnnouncementWizard } from "../PostAnnouncementWizard.tsx";

export default function NewAnnouncementView({
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
        <PostAnnouncementWizard />
      </div>
    </DefaultTemplate>
  );
}

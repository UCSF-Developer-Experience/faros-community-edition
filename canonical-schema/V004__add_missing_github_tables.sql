-- Hand-derived from dst 0.22.37 converters (S13/S14). Primary keys and column types are our best guess, not recovered schema. --
create table "vcs_UserEmail" (
  id text generated always as (pkey("user", email)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  email text not null,
  "user" text
);
create table "faros_Tag" (
  id text generated always as (pkey(uid)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  uid text not null,
  key text,
  value text
);
create table "vcs_RepositoryTag" (
  id text generated always as (pkey(repository, tag)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  tag text,
  repository text
);
create table "faros_VcsRepositoryOptions" (
  id text generated always as (pkey(repository)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  inclusion jsonb,
  repository text
);
create table "vcs_File" (
  id text generated always as (pkey(repository, uid)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  uid text not null,
  path text,
  repository text
);
create table "vcs_Label" (
  id text generated always as (pkey(name)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  name text not null
);
create table "vcs_PullRequestLabel" (
  id text generated always as (pkey("pullRequest", label)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  "pullRequest" text,
  label text
);
create table "vcs_PullRequestReviewRequest" (
  id text generated always as (pkey("pullRequest", "requestedReviewer")) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  "asCodeOwner" boolean,
  "pullRequest" text,
  "requestedReviewer" text
);
create table "vcs_PullRequestFile" (
  id text generated always as (pkey("pullRequest", file)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  additions integer,
  deletions integer,
  "pullRequest" text,
  file text
);

alter table "vcs_UserEmail" add foreign key ("user") references "vcs_User"(id);
alter table "vcs_RepositoryTag" add foreign key (tag) references "faros_Tag"(id);
alter table "vcs_RepositoryTag" add foreign key (repository) references "vcs_Repository"(id);
alter table "faros_VcsRepositoryOptions" add foreign key (repository) references "vcs_Repository"(id);
alter table "vcs_File" add foreign key (repository) references "vcs_Repository"(id);
alter table "vcs_PullRequestLabel" add foreign key ("pullRequest") references "vcs_PullRequest"(id);
alter table "vcs_PullRequestLabel" add foreign key (label) references "vcs_Label"(id);
alter table "vcs_PullRequestReviewRequest" add foreign key ("pullRequest") references "vcs_PullRequest"(id);
alter table "vcs_PullRequestReviewRequest" add foreign key ("requestedReviewer") references "vcs_User"(id);
alter table "vcs_PullRequestFile" add foreign key ("pullRequest") references "vcs_PullRequest"(id);
alter table "vcs_PullRequestFile" add foreign key (file) references "vcs_File"(id);

create index "vcs_UserEmail_origin_idx" on "vcs_UserEmail"(origin);
create index "faros_Tag_origin_idx" on "faros_Tag"(origin);
create index "vcs_RepositoryTag_origin_idx" on "vcs_RepositoryTag"(origin);
create index "faros_VcsRepositoryOptions_origin_idx" on "faros_VcsRepositoryOptions"(origin);
create index "vcs_File_origin_idx" on "vcs_File"(origin);
create index "vcs_Label_origin_idx" on "vcs_Label"(origin);
create index "vcs_PullRequestLabel_origin_idx" on "vcs_PullRequestLabel"(origin);
create index "vcs_PullRequestReviewRequest_origin_idx" on "vcs_PullRequestReviewRequest"(origin);
create index "vcs_PullRequestFile_origin_idx" on "vcs_PullRequestFile"(origin);

comment on column "vcs_UserEmail".id is 'generated';
comment on column "faros_Tag".id is 'generated';
comment on column "vcs_RepositoryTag".id is 'generated';
comment on column "faros_VcsRepositoryOptions".id is 'generated';
comment on column "vcs_File".id is 'generated';
comment on column "vcs_Label".id is 'generated';
comment on column "vcs_PullRequestLabel".id is 'generated';
comment on column "vcs_PullRequestReviewRequest".id is 'generated';
comment on column "vcs_PullRequestFile".id is 'generated';

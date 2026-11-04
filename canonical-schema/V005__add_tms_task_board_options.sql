-- Modeled on faros_VcsRepositoryOptions from V004. Converters (github/common.js, jira/faros_boards.js) write
-- { board: {uid, source}, inclusion: { category: 'Included' } }.
-- Key (pkey(board)) and column types are guesses from the converter, not recovered schema.

create table "faros_TmsTaskBoardOptions" (
  id text generated always as (pkey(board)) stored primary key,
  origin text,
  "refreshedAt" timestamptz not null default now(),
  inclusion jsonb,
  board text
);

alter table "faros_TmsTaskBoardOptions" add foreign key (board) references "tms_TaskBoard"(id);

create index "faros_TmsTaskBoardOptions_origin_idx" on "faros_TmsTaskBoardOptions"(origin);

comment on column "faros_TmsTaskBoardOptions".id is 'generated';

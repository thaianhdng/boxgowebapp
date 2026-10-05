-- Removes all BOXGO test data (every id starting with 7e57): the test
-- equipment lists, their share links, and their Projects / Calendar data.
-- Your own projects are not touched. Close BOXGO first, run this, then
-- open BOXGO again.
delete from shared_snapshots where project_id::text like '7e57%';
delete from projects where id::text like '7e57%';
delete from x_projects where id like '7e57%';

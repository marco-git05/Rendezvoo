select cron.schedule('close-expired-forms', '* * * * *', $$
  update hangout_forms set status = 'closed'
  where status = 'open' and deadline is not null and deadline < now()
$$);
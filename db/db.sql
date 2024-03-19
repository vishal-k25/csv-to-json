CREATE TABLE public.users (
    name varchar NOT NULL
    age int4 NOT NULL, 
    address jsonb NULL,
    additional_info jsonb NULL, id
    serial4 NOT NULL PRIMARY KEY
);

SELECT
  CASE
    WHEN age <= 20 THEN '< 20'
    WHEN age BETWEEN 21 AND 40 THEN '20 to 40'
    WHEN age BETWEEN 41 AND 60 THEN '40 to 60'
    ELSE '> 60'
  END AS age_group,
  COUNT(*) AS count,
  ROUND(CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) FROM public.users) * 100, 2) AS pct_distribution
FROM public.users
GROUP BY age_group
ORDER BY age_group;
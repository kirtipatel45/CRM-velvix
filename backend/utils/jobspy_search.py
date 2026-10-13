#!/usr/bin/env python3
"""
jobspy_search.py - Python JobSpy scraper with resume skill-matching
Integrates python-jobspy with CRM-velvix backend, producing JSearch-compatible JSON.
"""

import sys
import json
import re
from datetime import date, datetime
import pandas as pd
import numpy as np

try:
    from jobspy import scrape_jobs
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "python-jobspy is not installed. Please run: pip install -U python-jobspy pandas"
    }))
    sys.exit(1)


def parse_location(loc_str):
    """Parse city, state, country from location string."""
    if not loc_str or not isinstance(loc_str, str):
        return {"city": "", "state": "", "country": "USA"}
    
    parts = [p.strip() for p in loc_str.split(",") if p.strip()]
    if len(parts) >= 3:
        return {"city": parts[0], "state": parts[1], "country": parts[2]}
    elif len(parts) == 2:
        return {"city": parts[0], "state": parts[1], "country": "USA"}
    elif len(parts) == 1:
        return {"city": parts[0], "state": "", "country": "USA"}
    return {"city": "", "state": "", "country": "USA"}


def map_employment_type(job_type_str):
    if not job_type_str or not isinstance(job_type_str, str):
        return "FULLTIME"
    jt = job_type_str.lower()
    if "part" in jt:
        return "PARTTIME"
    if "contract" in jt or "c2c" in jt or "w2" in jt or "temp" in jt:
        return "CONTRACTOR"
    if "intern" in jt:
        return "INTERN"
    return "FULLTIME"


def extract_qualifications(description, skills, max_quals=8):
    """
    Extract qualification statements and matched skills from job description.
    Ensures frontend highlights candidate skills correctly.
    """
    if not description or not isinstance(description, str):
        return [f"Required skill: {s}" for s in skills[:max_quals]]

    lines = [line.strip() for line in description.split("\n") if line.strip()]
    qualifications = []
    seen = set()

    # 1. Extract lines that explicitly contain candidate skills
    for skill in skills:
        pattern = re.compile(r'\b' + re.escape(skill) + r'\b', re.IGNORECASE)
        for line in lines:
            cleaned = re.sub(r'^[*\-•\d\.\)]\s*', '', line).strip()
            if 15 <= len(cleaned) <= 250 and pattern.search(cleaned):
                if cleaned not in seen:
                    seen.add(cleaned)
                    qualifications.append(cleaned)
                    if len(qualifications) >= max_quals:
                        break
        if len(qualifications) >= max_quals:
            break

    # 2. Extract bullet points under requirement/qualification headers
    if len(qualifications) < 4:
        in_requirements = False
        req_headers = re.compile(r'qualif|require|must have|skills|experience|responsibilit', re.IGNORECASE)
        for line in lines:
            if req_headers.search(line) and len(line) < 60:
                in_requirements = True
                continue
            if in_requirements:
                if line.startswith(('*', '-', '•', '1', '2', '3', '4', '5')):
                    cleaned = re.sub(r'^[*\-•\d\.\)]\s*', '', line).strip()
                    if 15 <= len(cleaned) <= 250 and cleaned not in seen:
                        seen.add(cleaned)
                        qualifications.append(cleaned)
                        if len(qualifications) >= max_quals:
                            break
                elif len(line) < 30 and line.endswith(':'):
                    in_requirements = False

    # 3. Ensure any candidate skill mentioned in description is represented
    desc_lower = description.lower()
    for skill in skills:
        if skill.lower() in desc_lower and not any(skill.lower() in q.lower() for q in qualifications):
            qualifications.append(f"Demonstrated proficiency with {skill}")

    # Fallback if no qualifications extracted
    if not qualifications:
        qualifications = [f"Hands-on experience with {s}" for s in skills[:max_quals]]

    return qualifications[:max_quals]


def main():
    # Force UTF-8 stdout
    if sys.stdout.encoding != 'utf-8':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "No input JSON received"}))
            sys.exit(1)
        params = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to parse input JSON: {str(e)}"}))
        sys.exit(1)

    query = params.get("query", "").strip()
    skills = params.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]

    # If query is empty but skills provided, build search term
    if not query and skills:
        query = f"{' '.join(skills[:3])} developer"
    elif not query:
        print(json.dumps({"success": False, "error": "Query or skills parameter is required"}))
        sys.exit(1)

    # Date posted mapping to hours_old
    date_posted = str(params.get("date_posted", "month")).lower()
    hours_map = {
        "today": 24,
        "3days": 72,
        "week": 168,
        "month": 720,
        "all": None
    }
    hours_old = hours_map.get(date_posted, 720)

    # Remote filter
    remote_raw = params.get("remote_jobs_only", False)
    is_remote = True if str(remote_raw).lower() in ("true", "1") else False

    # Sites to scrape
    sites_param = params.get("sites")
    if sites_param and isinstance(sites_param, list) and len(sites_param) > 0:
        site_names = sites_param
    else:
        # High-performance default boards
        site_names = ["indeed", "linkedin", "glassdoor", "zip_recruiter"]

    results_wanted = int(params.get("results_wanted", 15))
    location = params.get("location", "USA")

    try:
        # Run JobSpy scraping
        scrape_kwargs = {
            "site_name": site_names,
            "search_term": query,
            "location": location,
            "results_wanted": results_wanted,
            "country_indeed": "USA",
            "is_remote": is_remote,
        }
        if hours_old is not None:
            scrape_kwargs["hours_old"] = hours_old

        df = scrape_jobs(**scrape_kwargs)

        if df is None or len(df) == 0:
            print(json.dumps({
                "success": True,
                "data": {
                    "data": [],
                    "count": 0,
                    "query": query,
                    "sites": site_names
                }
            }))
            sys.exit(0)

        # Clean NaN values
        df = df.replace({np.nan: None})
        records = df.to_dict(orient="records")

        transformed_jobs = []
        for idx, row in enumerate(records):
            title = row.get("title") or "Position"
            company = row.get("company") or "Company"
            loc_str = row.get("location") or "USA"
            loc_info = parse_location(loc_str)
            description = row.get("description") or ""

            # Check skill matches in title + description
            matched_skills = []
            title_desc = f"{title} {description}".lower()
            for s in skills:
                if s.lower() in title_desc:
                    matched_skills.append(s)

            # Dates
            date_val = row.get("date_posted")
            if isinstance(date_val, (date, datetime)):
                posted_utc = date_val.isoformat() + "T00:00:00.000Z"
            elif isinstance(date_val, str) and date_val:
                posted_utc = date_val
            else:
                posted_utc = datetime.utcnow().isoformat() + "Z"

            # Salary period
            interval = str(row.get("interval") or "").lower()
            if "year" in interval:
                salary_period = "YEAR"
            elif "hour" in interval:
                salary_period = "HOUR"
            elif "month" in interval:
                salary_period = "MONTH"
            else:
                salary_period = None

            # Apply link (prefer direct ATS URL, fallback to site URL)
            apply_link = row.get("job_url_direct") or row.get("job_url") or ""

            # Qualifications highlighting
            quals = extract_qualifications(description, skills)

            job_obj = {
                "job_id": row.get("id") or f"{row.get('site', 'job')}_{idx}_{abs(hash(title + company))}",
                "job_title": title,
                "employer_name": company,
                "employer_logo": row.get("company_logo"),
                "job_apply_link": apply_link,
                "job_city": loc_info["city"],
                "job_state": loc_info["state"],
                "job_country": loc_info["country"],
                "job_is_remote": bool(row.get("is_remote")) or ("remote" in loc_str.lower()),
                "job_min_salary": row.get("min_amount"),
                "job_max_salary": row.get("max_amount"),
                "job_salary_currency": row.get("currency") or "USD",
                "job_salary_period": salary_period,
                "job_posted_at_datetime_utc": posted_utc,
                "job_employment_type": map_employment_type(row.get("job_type")),
                "job_description": description,
                "job_source": row.get("site"),
                "job_highlights": {
                    "Qualifications": quals
                },
                "matched_skills": matched_skills,
                "matched_skills_count": len(matched_skills)
            }
            transformed_jobs.append(job_obj)

        # Sort by matched skills count descending, then by salary or presence of direct apply link
        transformed_jobs.sort(
            key=lambda j: (j["matched_skills_count"], bool(j["job_apply_link"]), bool(j["job_max_salary"])),
            reverse=True
        )

        response_payload = {
            "success": True,
            "data": {
                "data": transformed_jobs,
                "count": len(transformed_jobs),
                "query": query,
                "sites": site_names
            }
        }
        print(json.dumps(response_payload, ensure_ascii=False))

    except Exception as err:
        print(json.dumps({
            "success": False,
            "error": f"JobSpy execution failed: {str(err)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()

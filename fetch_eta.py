#!/usr/bin/env python3
"""
Terminal program to fetch real-time bus ETAs in Hong Kong.

Make sure you’ve installed the library with:
    python3 -m pip install hk-bus-eta
"""
import sys

try:
    from hk_bus_eta import HKEta
except ImportError:
    print(
        "Error: cannot import 'hk_bus_eta'.\n"
        "Please install it with:\n"
        "    python3 -m pip install hk-bus-eta\n"
        "and make sure you’re running the same Python interpreter."
    )
    sys.exit(1)


def main():
    # Preserve the exact input for display
    stop_input = input("Enter bus stop name (partial OK): ").strip()
    if not stop_input:
        print("No stop name entered. Exiting.")
        return
    stop_q = stop_input.lower()  # for case-insensitive matching

    routes_raw = input(
        "Enter route numbers to filter (comma-sep), or leave blank: "
    ).strip()
    routes_filter = (
        [r.strip() for r in routes_raw.split(",")] if routes_raw else None
    )

    eta_client = HKEta()
    all_route_ids = list(eta_client.route_list.keys())

    if routes_filter:
        route_ids = [
            rid for rid in all_route_ids
            if rid.split("+")[0] in routes_filter
        ]
    else:
        route_ids = all_route_ids

    matches = []
    for rid in route_ids:
        info = eta_client.route_list[rid]
        raw_stops = info.get("stops") or info.get("stop_seq") or []
        for idx, item in enumerate(raw_stops):
            if isinstance(item, dict):
                name_en = item.get("name_en", "")
                name_tc = item.get("name_tc", "")
                seq = item.get("seq", idx)
            else:
                name_en = str(item)
                name_tc = ""
                seq = idx

            # case-insensitive match
            if stop_q in name_en.lower() or stop_q in name_tc.lower():
                display = name_en or name_tc
                matches.append((rid, seq, display))

    if not matches:
        print(f'No stops matching "{stop_input}".')
        return

    if len(matches) > 1:
        print("\nMultiple matching stops found:")
        for i, (rid, seq, name) in enumerate(matches):
            route_no = rid.split("+")[0]
            dest = rid.split("+")[-1]
            print(f"  {i}: Route {route_no} → {dest}, seq {seq}, \"{name}\"")
        sel = input("Select index: ").strip()
        try:
            idx = int(sel)
            if idx < 0 or idx >= len(matches):
                raise ValueError()
        except ValueError:
            print("Invalid selection. Exiting.")
            return
    else:
        idx = 0

    rid, seq, name = matches[idx]
    route_no, dest = rid.split("+")[0], rid.split("+")[-1]
    print(f'\nFetching ETAs for Route {route_no} → {dest}, stop "{name}"\n')

    etas = eta_client.getEtas(route_id=rid, seq=seq, language="en")
    if not etas:
        print("No upcoming ETAs.")
        return

    print("Upcoming ETAs:")
    for e in etas:
        t = e.get("eta")
        remark = e.get("remark", {}).get("en", "")
        co = e.get("co", "")
        print(f"  - {t}   ({remark})   [{co}]")


if __name__ == "__main__":
    main()
from hk_bus_eta import HKEta

hketa = HKEta()
etas = hketa.getEtas(route_id = "TCL+1+Hong Kong+Tung Chung", seq=0, language="en")
print (etas)

"""
[{'eta': '2023-09-12T11:43:00+08:00', 'remark': {'zh': '1號月台', 'en': 'Platform 1'}, 'co': 'mtr'}, {'eta': '2023-09-12T11:51:00+08:00', 'remark': {'zh': '1號月台', 'en': 'Platform 1'}, 'co': 'mtr'}, {'eta': '2023-09-12T11:58:00+08:00', 'remark': {'zh': '1號月台', 'en': 'Platform 1'}, 'co': 'mtr'}, {'eta': '2023-09-12T12:05:00+08:00', 'remark': {'zh': '1號月台', 'en': 'Platform 1'}, 'co': 'mtr'}]
"""
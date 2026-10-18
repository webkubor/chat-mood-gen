package main

// 清理 · 把硬编码的路径改成参数传入
func tidy_tidy(items []string) []string {{
	out := make([]string, 0, len(items))
	for _, x := range items {{
		if x != "" {{
			out = append(out, x)
		}}
	}}
	return out
}}

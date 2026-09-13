(() => {
  "use strict";

  const state = {
    data: null,
    toastTimer: null,
    activeProject: null
  };

  const elements = {
    snapshotMetrics: document.querySelector("[data-snapshot-metrics]"),
    snapshotDate: document.querySelector("[data-snapshot-date]"),
    featured: document.querySelector("[data-featured-project]"),
    projectRegister: document.querySelector("[data-project-register]"),
    capabilityMatrix: document.querySelector("[data-capability-matrix]"),
    evidenceLedger: document.querySelector("[data-evidence-ledger]"),
    projectDialog: document.querySelector("[data-project-dialog]"),
    dialogContent: document.querySelector("[data-dialog-content]"),
    resumeDialog: document.querySelector("[data-resume-dialog]"),
    resumeContent: document.querySelector("[data-resume-content]"),
    toast: document.querySelector("[data-toast]")
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const htmlList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  const faultDefinitions = {
    network: {
      signal: "连接失败",
      classify: "出口节点异常",
      owner: "Provider Guard",
      decision: "切换健康节点",
      limit: "总尝试次数不超过 3 次",
      outcome: "在未输出正文前安全重放",
      reason: "节点故障属于可恢复网络边界；一旦正文已经发送，立即停止自动重放。"
    },
    quota: {
      signal: "429 / RESOURCE_EXHAUSTED",
      classify: "账号或项目配额耗尽",
      owner: "调用方策略",
      decision: "停止重试并进入冷却",
      limit: "不换节点，不重启本地后端",
      outcome: "明确返回配额失败",
      reason: "配额不是网络故障。继续换节点只会制造无效流量，并掩盖真正的恢复条件。"
    },
    model: {
      signal: "MODEL_NOT_FOUND",
      classify: "能力目录或配置不匹配",
      owner: "Provider Adapter",
      decision: "核对模型目录后返回",
      limit: "禁止用通用 retry 掩盖配置错误",
      outcome: "把不支持说清楚",
      reason: "先检查当前账号可见模型，再决定刷新目录或直接失败，不把配置问题伪装成网络问题。"
    },
    backend: {
      signal: "健康端点失联",
      classify: "Provider 后端不可用",
      owner: "唯一 Guard",
      decision: "事务化恢复后端",
      limit: "共享依赖只有一个恢复所有者",
      outcome: "先恢复服务，再接收新请求",
      reason: "两个通道共享依赖时，只有一个 Guard 可以执行恢复，避免双重重启放大故障。"
    }
  };

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2200);
  }

  async function copyText(text, confirmation) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      showToast(confirmation);
    } catch {
      showToast("复制失败，请在摘要窗口中手动选择");
    }
  }

  function renderSnapshot(snapshot) {
    elements.snapshotMetrics.innerHTML = snapshot.metrics.map((metric) => `
      <div>
        <dd>${escapeHtml(metric.value)}</dd>
        <dt>${escapeHtml(metric.label)}</dt>
      </div>
    `).join("");
    elements.snapshotDate.textContent = `${snapshot.date} · ${snapshot.label}`;
  }

  function renderArchitecture(project) {
    return project.architecture.map((node, index) => `
      <div class="architecture-node">
        <span>${String(index + 1).padStart(2, "0")}</span>
        ${escapeHtml(node)}
      </div>
      ${index < project.architecture.length - 1 ? '<div class="architecture-arrow" aria-hidden="true"></div>' : ""}
    `).join("");
  }

  function renderFacts(project, dialog = false) {
    if (dialog) {
      return project.facts.map((fact) => `
        <div class="dialog-fact">
          <strong>${escapeHtml(fact.value)}</strong>
          <span>${escapeHtml(fact.label)}</span>
          <small>${escapeHtml(fact.note)}</small>
        </div>
      `).join("");
    }

    return project.facts.map((fact) => `
      <div class="fact">
        <strong>${escapeHtml(fact.value)}</strong>
        <span>${escapeHtml(fact.label)} · ${escapeHtml(fact.note)}</span>
      </div>
    `).join("");
  }

  function renderFeatured(project) {
    elements.featured.innerHTML = `
      <article class="featured-case-header">
        <span>${escapeHtml(project.index)}</span>
        <p>${escapeHtml(project.category)}</p>
        <b>${escapeHtml(project.status)}</b>
      </article>
      <div class="featured-case-body">
        <article class="featured-copy">
          <h3>${escapeHtml(project.headline)}</h3>
          <p>${escapeHtml(project.summary)}</p>
          <div class="case-decisions">
            <article>
              <span>CONSTRAINT / 真实问题</span>
              <p>${escapeHtml(project.problem)}</p>
            </article>
            <article>
              <span>DECISION / 关键取舍</span>
              <p>${escapeHtml(project.solution)}</p>
            </article>
          </div>
          <div class="project-actions">
            <button class="text-action" type="button" data-project-open="${escapeHtml(project.slug)}">打开完整工程档案 →</button>
            <span>${escapeHtml(project.stack.slice(0, 3).join(" / "))}</span>
          </div>
        </article>
        <aside class="featured-system" aria-label="${escapeHtml(project.shortName)} 架构与事实">
          <p class="system-label">SYSTEM FLOW / VERIFIED CONSTRAINTS</p>
          <div class="architecture-chain">${renderArchitecture(project)}</div>
          <div class="fact-grid">${renderFacts(project)}</div>
        </aside>
      </div>
    `;
  }

  function renderProjectRegister(projects) {
    elements.projectRegister.innerHTML = projects.map((project) => `
      <article class="project-row" data-project-row="${escapeHtml(project.slug)}">
        <div class="project-row-top">
          <span class="project-row-index">${escapeHtml(project.index)}</span>
          <span class="project-row-status">${escapeHtml(project.status)}</span>
        </div>
        <div class="project-row-title">
          <h3>${escapeHtml(project.shortName)}</h3>
          <p>${escapeHtml(project.category)}</p>
        </div>
        <p class="project-row-summary">${escapeHtml(project.headline)}</p>
        <div class="project-row-footer">
          <span>${escapeHtml(project.stack.slice(0, 3).join(" / "))}</span>
          <button class="project-row-open" type="button" data-project-open="${escapeHtml(project.slug)}" aria-label="打开 ${escapeHtml(project.shortName)} 详情">→</button>
        </div>
      </article>
    `).join("");
  }

  function renderCapabilityMatrix(data) {
    const projects = data.projects;
    elements.capabilityMatrix.innerHTML = `
      <table class="capability-table">
        <thead>
          <tr>
            <th scope="col">工程能力</th>
            ${projects.map((project) => `<th scope="col">${escapeHtml(project.shortName)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data.capabilities.map((capability) => `
            <tr>
              <th scope="row">${escapeHtml(capability.name)}</th>
              ${projects.map((project) => {
                const present = capability.projects.includes(project.slug);
                return `<td><span class="matrix-dot${present ? " is-present" : ""}" aria-label="${present ? "有对应证据" : "无主要证据"}">${present ? "✓" : "·"}</span></td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderEvidenceLedger(data) {
    const verified = data.projects.filter((project) => project.statusType === "verified");
    const active = data.projects.filter((project) => project.statusType !== "verified");

    elements.evidenceLedger.innerHTML = `
      <article class="ledger-column">
        <span class="ledger-number">LEDGER / 01</span>
        <h3>已经验证</h3>
        <p>可以在面试中展示配置、流程或检查结果的现有能力。</p>
        <ul>${verified.map((project) => `<li>${escapeHtml(project.shortName)} — ${escapeHtml(project.status)}</li>`).join("")}</ul>
      </article>
      <article class="ledger-column">
        <span class="ledger-number">LEDGER / 02</span>
        <h3>正在作品集化</h3>
        <p>工程能力已经存在，但公开仓库、匿名数据与录屏仍按阶段补齐。</p>
        <ul>${data.projects.map((project) => `<li>${escapeHtml(project.shortName)} — ${escapeHtml(project.next)}</li>`).join("")}</ul>
      </article>
      <article class="ledger-column">
        <span class="ledger-number">LEDGER / 03</span>
        <h3>公开边界</h3>
        <p>对招聘方展示机制与证据，不暴露账号、密钥、Cookie、真实节点和私人历史数据。</p>
        <ul>
          <li>已运行与计划功能分开标注</li>
          <li>CS2 系统始终标记为 SIMULATION ONLY</li>
          <li>${active.length} 个持续开发案例不宣称生产上线</li>
        </ul>
      </article>
    `;
  }

  function projectDialogMarkup(project) {
    return `
      <header class="dialog-hero">
        <p class="section-label">${escapeHtml(project.index)} / ${escapeHtml(project.category)}</p>
        <h2 id="project-dialog-title">${escapeHtml(project.name)}</h2>
        <p>${escapeHtml(project.headline)}</p>
      </header>

      <div class="dialog-facts">${renderFacts(project, true)}</div>

      <section class="dialog-section">
        <h3>CONSTRAINT / 问题</h3>
        <p>${escapeHtml(project.problem)}</p>
      </section>
      <section class="dialog-section">
        <h3>DECISION / 方案</h3>
        <p>${escapeHtml(project.solution)}</p>
      </section>
      <section class="dialog-section">
        <h3>MECHANISM / 架构</h3>
        <div class="architecture-chain">${renderArchitecture(project)}</div>
      </section>
      <section class="dialog-section">
        <h3>OWNERSHIP / 负责内容</h3>
        <ul>${htmlList(project.responsibilities)}</ul>
      </section>
      <section class="dialog-section">
        <h3>EVIDENCE / 验证证据</h3>
        <ul>${htmlList(project.proof)}</ul>
      </section>
      <section class="dialog-section">
        <h3>STACK / 技术</h3>
        <ul class="stack-list">${htmlList(project.stack)}</ul>
      </section>
      <section class="dialog-section">
        <h3>NEXT / 下一步</h3>
        <p class="next-box">${escapeHtml(project.next)}</p>
      </section>
    `;
  }

  function openProject(slug, updateUrl = true) {
    if (!state.data) return;
    const project = state.data.projects.find((candidate) => candidate.slug === slug);
    if (!project) return;

    state.activeProject = slug;
    elements.dialogContent.innerHTML = projectDialogMarkup(project);
    elements.projectDialog.showModal();
    if (updateUrl) history.replaceState(null, "", `#project=${encodeURIComponent(slug)}`);
  }

  function closeProject(updateUrl = true) {
    if (elements.projectDialog.open) elements.projectDialog.close();
    state.activeProject = null;
    if (updateUrl && location.hash.startsWith("#project=")) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
  }

  function resumeText() {
    const { profile, resume } = state.data;
    return [
      `${profile.name} — ${resume.headline}`,
      "",
      resume.intro,
      "",
      ...resume.bullets.map((bullet) => `• ${bullet}`)
    ].join("\n");
  }

  function renderResume() {
    const { resume } = state.data;
    elements.resumeContent.innerHTML = `
      <p class="resume-intro">${escapeHtml(resume.intro)}</p>
      <ol class="resume-bullets">${htmlList(resume.bullets)}</ol>
    `;
  }

  function openResume() {
    if (!state.data) return;
    renderResume();
    elements.resumeDialog.showModal();
  }

  function setupFailureAtlas() {
    const atlas = document.querySelector("[data-failure-atlas]");
    if (!atlas) return;

    const tabs = [...atlas.querySelectorAll("[data-fault]")];
    const fields = {
      signal: atlas.querySelector("[data-atlas-signal]"),
      classify: atlas.querySelector("[data-atlas-classify]"),
      owner: atlas.querySelector("[data-atlas-owner]"),
      decision: atlas.querySelector("[data-atlas-decision]"),
      limit: atlas.querySelector("[data-atlas-limit]"),
      outcome: atlas.querySelector("[data-atlas-outcome]"),
      reason: atlas.querySelector("[data-atlas-reason]")
    };

    const activate = (fault) => {
      const definition = faultDefinitions[fault];
      if (!definition) return;
      tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.fault === fault)));
      Object.entries(fields).forEach(([key, element]) => {
        if (element) element.textContent = definition[key];
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab.dataset.fault));
      tab.addEventListener("keydown", (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        next.focus();
        activate(next.dataset.fault);
      });
    });
  }

  function bindInteractions() {
    document.addEventListener("click", (event) => {
      const projectTrigger = event.target.closest("[data-project-open]");
      if (projectTrigger) {
        openProject(projectTrigger.dataset.projectOpen);
        return;
      }

      const projectRow = event.target.closest("[data-project-row]");
      if (projectRow && !event.target.closest("button, a")) {
        openProject(projectRow.dataset.projectRow);
      }
    });

    document.querySelectorAll("[data-resume-trigger]").forEach((trigger) => {
      trigger.addEventListener("click", openResume);
    });

    document.querySelectorAll("[data-resume-close]").forEach((trigger) => {
      trigger.addEventListener("click", () => elements.resumeDialog.close());
    });

    document.querySelector("[data-dialog-close]").addEventListener("click", () => closeProject());
    document.querySelector("[data-copy-resume]").addEventListener("click", () => {
      copyText(resumeText(), "简历摘要已复制");
    });
    document.querySelector("[data-copy-summary]").addEventListener("click", () => {
      copyText(state.data.profile.summary, "个人摘要已复制");
    });

    elements.projectDialog.addEventListener("close", () => {
      if (state.activeProject) closeProject();
    });

    [elements.projectDialog, elements.resumeDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          if (dialog === elements.projectDialog) closeProject();
          else dialog.close();
        }
      });
    });
  }

  function setupReveal() {
    const items = document.querySelectorAll(".reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.08 && rect.bottom > -40) {
        item.classList.add("is-visible");
      } else {
        observer.observe(item);
      }
    });
  }

  function setupSectionTracking() {
    if (!("IntersectionObserver" in window)) return;
    const sections = ["work", "method", "evidence"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const links = new Map([...document.querySelectorAll(".site-nav a")]
      .map((link) => [link.getAttribute("href").slice(1), link]));

    const observer = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      links.forEach((link, id) => {
        if (id === active.target.id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-30% 0px -55%", threshold: [0, 0.25, 0.6] });

    sections.forEach((section) => observer.observe(section));
  }

  function handleInitialHash() {
    if (!location.hash.startsWith("#project=")) return;
    const slug = decodeURIComponent(location.hash.slice("#project=".length));
    openProject(slug, false);
  }

  function renderError(error) {
    const message = "作品集数据加载失败。请通过 npm run dev 启动本地服务器。";
    console.error(error);
    [elements.featured, elements.projectRegister, elements.capabilityMatrix, elements.evidenceLedger]
      .filter(Boolean)
      .forEach((element) => {
        element.innerHTML = `<div class="error-state" role="alert">${message}</div>`;
      });
  }

  async function init() {
    try {
      const response = await fetch("./data/portfolio.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Portfolio data responded ${response.status}`);
      state.data = await response.json();

      renderSnapshot(state.data.snapshot);
      const featured = state.data.projects.find((project) => project.featured);
      renderFeatured(featured);
      renderProjectRegister(state.data.projects.filter((project) => !project.featured));
      renderCapabilityMatrix(state.data);
      renderEvidenceLedger(state.data);
      bindInteractions();
      setupFailureAtlas();
      setupReveal();
      setupSectionTracking();
      handleInitialHash();
    } catch (error) {
      renderError(error);
      setupReveal();
    }
  }

  init();
})();

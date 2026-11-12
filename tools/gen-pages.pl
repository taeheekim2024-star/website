#!/usr/bin/perl
# Generates the research-area finder pages and the simulation page. Run from dist/:  perl ../tools/gen-pages.pl
# The page shell (head, notice bar, header, footer) is copied from the Join page of each language, and the
# area titles, descriptions, topics and image alt text are read from the research page, so the generated
# pages always repeat what the research page says.
# Output: fit.html, fit-<area>.html, sim.html and the same under en/.
use strict; use warnings;
my $S = 'https://taeheekim.kr/';
my @areas = qw(ai synthesis capture catalysis energy);
sub slurp { my $f = shift; open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $s = <$fh>; close $fh; $s }
sub spit  { my ($f, $s) = @_; open my $fh, '>:raw', $f or die "$f: $!"; print $fh $s; close $fh }

my %L = (
  ko => {
    dir => '', og => '',
    fit_title => '나와 맞는 연구 분야 찾기 — DMSE Lab · 단국대학교 신소재공학과',
    fit_desc  => '질문 다섯 개에 답하면 DMSE Lab의 다섯 연구 분야 가운데 잘 맞는 분야를 알려 드립니다. AI 기반 소재 설계, 나노다공성 소재 합성, 선택적 흡착과 분리, 촉매 소재와 반응, 전기화학 소재와 계면.',
    fit_ogt   => '나와 맞는 연구 분야 찾기 · DMSE Lab',
    ogd       => '질문 다섯 개로 찾는 나와 맞는 연구 분야. 단국대학교 신소재공학과 DMSE Lab.',
    res_title => '나와 맞는 연구 분야: %s — DMSE Lab',
    res_ogt   => '나와 맞는 연구 분야: %s',
    hero      => '<p class="eyebrow">연구 분야 찾기</p>' . "\n" . '<h1>나와 맞는 연구 분야</h1>' . "\n" . '<p>질문 다섯 개에 답하면 DMSE Lab의 다섯 연구 분야 가운데 잘 맞는 분야를 알려 드립니다.</p>',
    nojs      => '이 페이지는 자바스크립트를 켜야 볼 수 있습니다. <a href="research.html">연구 분야 보기</a>',
    five      => '다섯 연구 분야',
    shared    => '<span>공유된 결과입니다.</span><a href="fit.html">나와 맞는 분야 찾기 →</a>',
    eyebrow   => '나와 맞는 연구 분야',
    consult   => '이 분야로 상담 신청', sim => '시뮬레이션 해 보기 →', more => '연구 내용 보기 →', share => '결과 공유', again => '다시 하기', second => '함께 볼 분야',
    why => {
      ai        => '코드와 데이터로 답을 찾는 일이 재미있는 사람에게 맞습니다.',
      synthesis => '손으로 직접 만들어 보는 일이 재미있는 사람에게 맞습니다.',
      capture   => '섞인 것에서 원하는 것만 골라내는 문제가 궁금한 사람에게 맞습니다.',
      catalysis => '반응이 왜, 얼마나 빨리 일어나는지 궁금한 사람에게 맞습니다.',
      energy    => '전기를 저장하고 꺼내 쓰는 장치와 측정에 끌리는 사람에게 맞습니다.',
    },
    sim_title => '연구 분야 시뮬레이션 — DMSE Lab · 단국대학교 신소재공학과',
    sim_desc  => '다섯 연구 분야의 원리를 직접 만져 보는 시뮬레이션. AI 기반 소재 설계, 졸겔 합성과 건조, CO₂ 흡착과 분리, 수소 발생 촉매, 다공성 전극의 전하 저장.',
    sim_ogt   => '연구 분야 시뮬레이션 · DMSE Lab',
    sim_ogd   => '값을 바꿔 가며 직접 해 보는 다섯 가지 연구 모형. 단국대학교 신소재공학과 DMSE Lab.',
    sim_hero  => '<p class="eyebrow">SIMULATION</p>' . "\n" . '<h1>연구 분야 시뮬레이션</h1>' . "\n" . '<p>다섯 연구 분야의 원리를 단순한 모형으로 옮겼습니다. 값을 바꾸고 눌러 보면서 어떤 일이 일어나는지 확인해 보세요.</p>',
    sim_tabs  => '연구 분야',
  },
  en => {
    dir => 'en/', og => 'en-',
    fit_title => 'Find your research area — DMSE Lab · Dankook University',
    fit_desc  => 'Answer five questions and we will point you to the best match among the five research areas of DMSE Lab: AI-guided materials design, synthesis of nanoporous materials, selective adsorption and separation, catalytic materials and reactions, and electrochemical materials and interfaces.',
    fit_ogt   => 'Find your research area · DMSE Lab',
    ogd       => 'Five questions to find the research area that fits you. DMSE Lab, Dankook University.',
    res_title => 'My research area: %s — DMSE Lab',
    res_ogt   => 'My research area: %s',
    hero      => '<p class="eyebrow">FIND YOUR AREA</p>' . "\n" . '<h1>Which research area suits you?</h1>' . "\n" . '<p>Answer five questions and we will point you to the best match among the five research areas of DMSE Lab.</p>',
    nojs      => 'This page needs JavaScript. <a href="en/research.html">See the research areas</a>',
    five      => 'THE FIVE AREAS',
    shared    => '<span>This is a shared result.</span><a href="en/fit.html">Find your area →</a>',
    eyebrow   => 'YOUR RESEARCH AREA',
    consult   => 'Request a meeting about this area', sim => 'Try the simulation →', more => 'See the research →', share => 'Share result', again => 'Take it again', second => 'Also worth a look',
    why => {
      ai        => 'A good match if you enjoy finding answers with code and data.',
      synthesis => 'A good match if you enjoy making things by hand.',
      capture   => 'A good match if you are curious about picking one thing out of a mixture.',
      catalysis => 'A good match if you want to know why and how fast reactions happen.',
      energy    => 'A good match if you are drawn to devices and measurements that store and deliver electricity.',
    },
    sim_title => 'Research simulations — DMSE Lab · Dankook University',
    sim_desc  => 'Hands-on simulations of the five research areas: AI-guided materials design, sol–gel synthesis and drying, CO₂ adsorption and separation, hydrogen evolution catalysis, and charge storage in porous electrodes.',
    sim_ogt   => 'Research simulations · DMSE Lab',
    sim_ogd   => 'Five small models you can play with. DMSE Lab, Dankook University.',
    sim_hero  => '<p class="eyebrow">SIMULATION</p>' . "\n" . '<h1>Research simulations</h1>' . "\n" . '<p>The ideas behind our five research areas, turned into simple models. Change the values, click around, and see what happens.</p>',
    sim_tabs  => 'Research areas',
  },
);

for my $lang (qw(ko en)) {
  my $t = $L{$lang}; my $dir = $t->{dir};
  my $shell = slurp("${dir}join.html");
  my $research = slurp("${dir}research.html");
  my $jsp = $lang eq 'ko' ? '' : './';

  my %card;
  while ($research =~ m{<article class="rcard reveal" id="(\w+)".*?<img src="[^"]*" alt="([^"]*)".*?<span class="rn">(\d+)</span><div><h2>(.*?)<small>(.*?)</small></h2><p>(.*?)</p>\s*<ul class="rtopics">(.*?)</ul>}gs) {
    $card{$1} = { alt => $2, n => $3, title => $4, sub => $5, desc => $6, topics => $7 };
  }
  for my $a (@areas) { die "research card $a not found in ${dir}research.html" unless $card{$a}; }

  my $make = sub {
    my ($file, %o) = @_;
    my $h = $shell;
    my $url = $S . $dir . $file; my $ko = $S . $file; my $en = $S . 'en/' . $file;
    my $robots = $o{noindex} ? "\n" . '<meta name="robots" content="noindex,follow">' : '';
    my $ogd = $o{ogd} // $t->{ogd};
    $h =~ s{<title>.*?</title>}{<title>$o{title}</title>}s or die "title";
    $h =~ s{<meta name="description" content="[^"]*">}{<meta name="description" content="$o{desc}">$robots} or die "description";
    $h =~ s{<link rel="canonical" href="[^"]*">}{<link rel="canonical" href="$url">} or die "canonical";
    $h =~ s{<link rel="alternate" hreflang="en" href="[^"]*">}{<link rel="alternate" hreflang="en" href="$en">} or die "hreflang en";
    $h =~ s{<link rel="alternate" hreflang="ko" href="[^"]*">}{<link rel="alternate" hreflang="ko" href="$ko">} or die "hreflang ko";
    $h =~ s{<link rel="alternate" hreflang="x-default" href="[^"]*">}{<link rel="alternate" hreflang="x-default" href="$ko">} or die "hreflang x-default";
    $h =~ s{<meta property="og:url" content="[^"]*">}{<meta property="og:url" content="$url">} or die "og:url";
    $h =~ s{<meta property="og:image" content="[^"]*">}{<meta property="og:image" content="$o{img}">} or die "og:image";
    $h =~ s{<meta property="og:title" content="[^"]*">}{<meta property="og:title" content="$o{ogt}">} or die "og:title";
    $h =~ s{<meta property="og:description" content="[^"]*">}{<meta property="og:description" content="$ogd">} or die "og:description";
    my $n = $lang eq 'ko'
      ? ($h =~ s{href="en/join\.html" lang="en"}{href="en/$file" lang="en"}g)
      : ($h =~ s{href="join\.html" lang="ko"}{href="$file" lang="ko"}g);
    die "language links in $dir$file ($n)" unless $n && $n == 2;
    $h =~ s{<main>.*?</main>}{$o{main}}s or die "main";
    # Only the simulation loads Three.js; both languages resolve this through
    # the document base (the English shell already has <base href="../">).
    my $importmap = $file eq 'sim.html'
      ? '<script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script>' . "\n" : '';
    my $script_type = $file eq 'sim.html' ? ' type="module"' : '';
    $h =~ s{(<script src="(?:\./)?site\.js\?v=([0-9a-z]+)"></script>)}{$1\n$importmap<script$script_type src="${jsp}$o{js}?v=$2"></script>} or die "site.js tag";
    if ($file eq 'sim.html') {
      $h =~ s{((?:light\.css|sim\.js)\?v=)[0-9a-z]+}{${1}20261112sim3d4}g;
    }
    spit("$dir$file", $h);
    print "$dir$file\n";
  };

  # the question page: the question card, and beside it the five areas with links to the research page
  my $list = join("\n", map { my $c = $card{$_}; qq{<a href="${dir}research.html#$_"><img src="assets/research/$_.jpg" alt="" loading="lazy"><span><small>$c->{n}</small>$c->{title}</span></a>} } @areas);
  $make->('fit.html',
    title => $t->{fit_title}, desc => $t->{fit_desc}, ogt => $t->{fit_ogt}, js => 'fit.js',
    img => "${S}assets/og/$t->{og}fit.jpg",
    main => qq{<main>\n<section class="page-hero"><div class="wrap">\n$t->{hero}\n</div></section>\n\n<section class="section"><div class="wrap fit-wrap">\n<div class="fit" data-fit><noscript><p class="empty">$t->{nojs}</p></noscript></div>\n<aside class="fit-areas"><p class="eyebrow">$t->{five}</p>\n$list\n</aside>\n</div></section>\n</main>},
  );

  # one result page per area
  for my $a (@areas) {
    my $c = $card{$a};
    my $main = qq{<main>\n<section class="section" data-fit-result="$a"><div class="wrap">\n}
      . qq{<p class="fit-shared" data-fit-shared>$t->{shared}</p>\n}
      . qq{<div class="fit-res">\n<div class="fit-res-img"><img src="assets/research/$a.jpg" alt="$c->{alt}"></div>\n<div>\n}
      . qq{<p class="eyebrow">$t->{eyebrow}</p>\n<h1><small>$c->{n}</small>$c->{title}<span>$c->{sub}</span></h1>\n}
      . qq{<p class="fit-why">$t->{why}{$a}</p>\n<p class="fit-desc">$c->{desc}</p>\n<ul class="rtopics">$c->{topics}</ul>\n}
      . qq{<p class="fit-actions"><a class="primary-action" data-mail="consult" data-topic="$c->{title}" href="${dir}join.html#contact">$t->{consult} <span aria-hidden="true">↗</span></a><a class="text-action" href="${dir}sim.html#$a">$t->{sim}</a><a class="text-action" href="${dir}research.html#$a">$t->{more}</a></p>\n}
      . qq{<p class="fit-sub"><button type="button" class="text-action" data-fit-share>$t->{share}</button><a class="text-action" href="${dir}fit.html" data-fit-retake>$t->{again}</a></p>\n}
      . qq{<p class="fit-second" data-fit-second hidden>$t->{second}<a href="${dir}research.html"></a></p>\n}
      . qq{</div>\n</div>\n</div></section>\n</main>};
    $make->("fit-$a.html",
      title => sprintf($t->{res_title}, $c->{title}), desc => "$c->{desc} $t->{ogd}", ogt => sprintf($t->{res_ogt}, $c->{title}), js => 'fit.js',
      img => "${S}assets/og/$t->{og}fit-$a.jpg", noindex => 1, main => $main,
    );
  }

  # the simulation page: one tab per area; sim.js draws the model and fills the side panel
  my $tabs = join("\n", map { my $c = $card{$_}; qq{<a role="tab" aria-selected="false" data-sim-tab="$_" href="${dir}sim.html#$_"><small>$c->{n}</small>$c->{title}</a>} } @areas);
  my $sim = qq{<main>\n<section class="page-hero"><div class="wrap">\n$t->{sim_hero}\n</div></section>\n\n<section class="section"><div class="wrap">\n<div class="sim" data-sim>\n}
    . qq{<div class="sim-tabs" role="tablist" aria-label="$t->{sim_tabs}">\n$tabs\n</div>\n}
    . qq{<div class="sim-body">\n<div class="sim-stage"><canvas class="sim-canvas" role="img"></canvas><button type="button" class="sim-start" hidden></button></div>\n}
    . qq{<div class="sim-panel">\n<h2 class="sim-title"></h2>\n<p class="sim-lead"></p>\n<p class="sim-hint"></p>\n<div class="sim-controls"></div>\n<p class="sim-status" aria-live="polite"></p>\n<dl class="sim-read"></dl>\n<canvas class="sim-plot" hidden></canvas>\n}
    . qq{<p class="sim-actions"><a class="primary-action" data-mail="consult" href="${dir}join.html#contact">$t->{consult} <span aria-hidden="true">↗</span></a><a class="text-action" data-sim-more href="${dir}research.html">$t->{more}</a></p>\n</div>\n</div>\n}
    . qq{<noscript><p class="empty">$t->{nojs}</p></noscript>\n</div>\n</div></section>\n</main>};
  $make->('sim.html',
    title => $t->{sim_title}, desc => $t->{sim_desc}, ogt => $t->{sim_ogt}, ogd => $t->{sim_ogd}, js => 'sim.js',
    img => "${S}assets/og/$t->{og}sim.jpg", main => $sim,
  );
}

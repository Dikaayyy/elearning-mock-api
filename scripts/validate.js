'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const COURSES_FILE = path.join(ROOT_DIR, 'courses.json');
const COURSES_DIR = path.join(ROOT_DIR, 'courses');

const COURSE_LIST_KEYS = [
  'id',
  'title',
  'description',
  'thumbnailUrl',
  'instructor',
  'lessonCount',
  'totalDurationMinutes',
];
const COURSE_DETAIL_KEYS = [
  'id',
  'title',
  'description',
  'thumbnailUrl',
  'instructor',
  'lessons',
];
const LESSON_KEYS = ['id', 'order', 'title', 'durationSeconds', 'videoUrl'];

const errors = [];

function addError(msg) {
  errors.push(msg);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    addError(`File tidak ditemukan: ${path.relative(ROOT_DIR, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    addError(`JSON tidak valid pada ${path.relative(ROOT_DIR, filePath)}: ${err.message}`);
    return null;
  }
}

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function checkKeys(obj, expectedKeys, context) {
  if (!isPlainObject(obj)) {
    addError(`${context}: harus berupa object.`);
    return false;
  }
  const actualKeys = Object.keys(obj);
  for (const key of expectedKeys) {
    if (!(key in obj)) {
      addError(`${context}: field wajib "${key}" tidak ada.`);
    }
  }
  for (const key of actualKeys) {
    if (!expectedKeys.includes(key)) {
      addError(`${context}: field di luar kontrak "${key}".`);
    }
  }
  return true;
}

function checkNonEmptyString(val, context) {
  if (typeof val !== 'string' || val.trim() === '') {
    addError(`${context}: harus berupa string non-kosong.`);
    return false;
  }
  return true;
}

function checkPositiveInt(val, context) {
  if (!Number.isInteger(val) || val <= 0) {
    addError(`${context}: harus berupa integer positif.`);
    return false;
  }
  return true;
}

function checkHttpsUrl(val, context, suffix) {
  if (!checkNonEmptyString(val, context)) return;
  if (!val.startsWith('https://')) {
    addError(`${context}: harus menggunakan protokol https://.`);
  }
  if (suffix && !val.endsWith(suffix)) {
    addError(`${context}: harus berakhiran ${suffix}.`);
  }
}

function validate() {
  const courses = readJson(COURSES_FILE);
  if (!Array.isArray(courses)) {
    if (courses !== null) addError('courses.json: root harus berupa array.');
    return report();
  }
  if (courses.length === 0) {
    addError('courses.json: tidak boleh kosong.');
    return report();
  }

  const seenIds = new Set();
  let totalLessons = 0;

  courses.forEach((item, idx) => {
    const listCtx = `courses.json[${idx}]`;
    if (!checkKeys(item, COURSE_LIST_KEYS, listCtx)) return;

    const hasId = checkNonEmptyString(item.id, `${listCtx}.id`);
    if (hasId) {
      if (seenIds.has(item.id)) {
        addError(`${listCtx}.id: duplikat id "${item.id}".`);
      }
      seenIds.add(item.id);
    }

    checkNonEmptyString(item.title, `${listCtx}.title`);
    checkNonEmptyString(item.description, `${listCtx}.description`);
    checkHttpsUrl(item.thumbnailUrl, `${listCtx}.thumbnailUrl`);
    checkNonEmptyString(item.instructor, `${listCtx}.instructor`);
    checkPositiveInt(item.lessonCount, `${listCtx}.lessonCount`);
    checkPositiveInt(item.totalDurationMinutes, `${listCtx}.totalDurationMinutes`);

    if (!hasId) return;

    const detailRel = `courses/${item.id}.json`;
    const detail = readJson(path.join(COURSES_DIR, `${item.id}.json`));
    if (!detail || !checkKeys(detail, COURSE_DETAIL_KEYS, detailRel)) return;

    checkNonEmptyString(detail.id, `${detailRel}.id`);
    checkNonEmptyString(detail.title, `${detailRel}.title`);
    checkNonEmptyString(detail.description, `${detailRel}.description`);
    checkHttpsUrl(detail.thumbnailUrl, `${detailRel}.thumbnailUrl`);
    checkNonEmptyString(detail.instructor, `${detailRel}.instructor`);

    // Sinkronisasi field antara list dan detail
    for (const field of ['id', 'title', 'instructor', 'thumbnailUrl']) {
      if (detail[field] !== item[field]) {
        addError(`${detailRel}.${field}: tidak sinkron dengan ${listCtx}.${field}.`);
      }
    }
    if (
      typeof item.description === 'string' &&
      typeof detail.description === 'string' &&
      !detail.description.startsWith(item.description)
    ) {
      addError(
        `${detailRel}.description: tidak sinkron dengan ${listCtx}.description (versi detail harus konsisten dengan versi ringkas).`
      );
    }

    if (!Array.isArray(detail.lessons) || detail.lessons.length === 0) {
      addError(`${detailRel}.lessons: harus berupa array non-kosong.`);
      return;
    }

    let durationSum = 0;
    let prevVideoUrl = null;

    detail.lessons.forEach((lesson, lIdx) => {
      const lessonCtx = `${detailRel}.lessons[${lIdx}]`;
      if (!checkKeys(lesson, LESSON_KEYS, lessonCtx)) return;

      const expectedOrder = lIdx + 1;
      const expectedId = `${item.id}-${expectedOrder}`;

      if (typeof lesson.id !== 'string') {
        addError(`${lessonCtx}.id: harus bertipe string.`);
      } else if (lesson.id !== expectedId) {
        addError(`${lessonCtx}.id: harus "${expectedId}", ditemukan "${lesson.id}".`);
      }

      if (!Number.isInteger(lesson.order) || lesson.order !== expectedOrder) {
        addError(`${lessonCtx}.order: harus ${expectedOrder} secara berurutan.`);
      }

      checkNonEmptyString(lesson.title, `${lessonCtx}.title`);
      if (checkPositiveInt(lesson.durationSeconds, `${lessonCtx}.durationSeconds`)) {
        durationSum += lesson.durationSeconds;
      }

      checkHttpsUrl(lesson.videoUrl, `${lessonCtx}.videoUrl`, '.mp4');
      if (prevVideoUrl !== null && lesson.videoUrl === prevVideoUrl) {
        addError(`${lessonCtx}.videoUrl: tidak boleh sama dengan lesson sebelumnya.`);
      }
      prevVideoUrl = lesson.videoUrl;
    });

    if (item.lessonCount !== detail.lessons.length) {
      addError(
        `${listCtx}.lessonCount (${item.lessonCount}): tidak cocok dengan jumlah lessons di ${detailRel} (${detail.lessons.length}).`
      );
    }

    const expectedMinutes = Math.round(durationSum / 60);
    if (item.totalDurationMinutes !== expectedMinutes) {
      addError(
        `${listCtx}.totalDurationMinutes (${item.totalDurationMinutes}): harus ${expectedMinutes} (Math.round(${durationSum} / 60)).`
      );
    }

    totalLessons += detail.lessons.length;
  });

  if (fs.existsSync(COURSES_DIR)) {
    const extraFiles = fs
      .readdirSync(COURSES_DIR)
      .filter((f) => f.endsWith('.json') && !seenIds.has(f.replace(/\.json$/, '')));
    for (const file of extraFiles) {
      addError(`courses/${file}: tidak terdaftar pada courses.json.`);
    }
  }

  return report(courses.length, totalLessons);
}

function report(courseCount = 0, lessonCount = 0) {
  if (errors.length > 0) {
    console.error(`Validasi gagal (${errors.length} error):`);
    errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
    process.exit(1);
  }
  console.log(`Validasi berhasil: ${courseCount} course, ${lessonCount} lesson valid dan sinkron.`);
}

validate();

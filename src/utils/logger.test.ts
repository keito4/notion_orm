// Jest globals (describe, it, expect, beforeEach, afterEach, jest) are available without import in Jest 30+
import { logger } from "./logger";

declare const process: {
  env: {
    DEBUG?: string;
  };
};

type MockSpyInstance = {
  mockImplementation: (_: () => void) => MockSpyInstance;
  mockRestore: () => void;
  mockClear: () => void;
};

describe("Logger", () => {
  let mockConsole: {
    log: MockSpyInstance;
    error: MockSpyInstance;
  };

  beforeEach(() => {
    mockConsole = {
      log: jest.spyOn(console, "log").mockImplementation(() => {}),
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
    };
    // テストごとにモックをクリア
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
  });

  it("should log info messages", () => {
    logger.info("info message");
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should log warning messages", () => {
    logger.warn("warning message");
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should log error messages with error object", () => {
    const error = new Error("test error");
    logger.error("error message", error);
    expect(mockConsole.error).toHaveBeenCalledTimes(2); // エラーメッセージとフォーマットされたエラー情報
    expect(mockConsole.error).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("error message")
    );
    expect(mockConsole.error).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("test error")
    );
  });

  it("should log error messages without error object", () => {
    logger.error("error message");
    expect(mockConsole.log).toHaveBeenCalledTimes(1);
    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining("error message")
    );
  });

  it("should log debug messages when DEBUG is enabled", () => {
    process.env.DEBUG = "true";
    logger.debug("debug message");
    expect(mockConsole.log).toHaveBeenCalled();
    delete process.env.DEBUG;
  });

  it("should not log debug messages when DEBUG is disabled", () => {
    delete process.env.DEBUG;
    logger.debug("debug message");
    expect(mockConsole.log).not.toHaveBeenCalled();
  });

  it("should log success messages", () => {
    logger.success("success message");
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should handle empty messages", () => {
    logger.info("");
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should handle undefined messages", () => {
    logger.info(undefined as unknown as string);
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should handle object messages by converting to string", () => {
    const testObj = { key: "value" };
    logger.info(JSON.stringify(testObj));
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should handle array messages by converting to string", () => {
    const testArray = [1, 2, 3];
    logger.info(JSON.stringify(testArray));
    expect(mockConsole.log).toHaveBeenCalled();
  });

  it("should handle multiple arguments", () => {
    logger.info("message", "additional", "args");
    expect(mockConsole.log).toHaveBeenCalled();
  });
});
